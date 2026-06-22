import secrets
import urllib.parse
import httpx
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserOut, Token
from app.utils.security import hash_password, verify_password, create_access_token
from app.services.auth import get_current_user
from app.services import email_service
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _gen_token(nbytes: int = 48) -> str:
    return secrets.token_urlsafe(nbytes)


# ─────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────
@router.post("/register", status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Duplicate checks
    if (await db.execute(select(User).where(User.username == data.username))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")
    if (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered. Please sign in.")

    token = _gen_token()
    expires = datetime.now(timezone.utc) + timedelta(hours=24)

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        is_verified=False,
        verification_token=token,
        verification_expires=expires,
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Username or email already in use")

    # Create MongoDB profile (non-fatal if MongoDB is down)
    try:
        from app.models.mongo_user import UserProfile
        from app.db.mongodb import is_connected
        if is_connected():
            existing = await UserProfile.find_one(UserProfile.email == data.email)
            if not existing:
                await UserProfile(
                    email=data.email,
                    username=data.username,
                    sqlite_user_id=user.id,
                ).insert()
    except Exception:
        pass

    await email_service.send_verification_email(user.email, user.username, token)

    return {
        "message": "Registration successful. Please check your email to verify your account.",
        "email": user.email,
    }


# ─────────────────────────────────────────────
# VERIFY EMAIL
# ─────────────────────────────────────────────
@router.get("/verify/{token}")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    if user.is_verified:
        return {"message": "Email already verified. You can sign in."}
    if user.verification_expires and datetime.now(timezone.utc) > user.verification_expires.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Verification link has expired. Please request a new one.")

    user.is_verified = True
    user.verification_token = None
    user.verification_expires = None
    await db.commit()

    await email_service.send_welcome_email(user.email, user.username)
    return {"message": "Email verified successfully! You can now sign in."}


# ─────────────────────────────────────────────
# RESEND VERIFICATION
# ─────────────────────────────────────────────
class ResendRequest(BaseModel):
    email: EmailStr

@router.post("/resend-verification")
async def resend_verification(data: ResendRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        # Don't reveal whether email exists
        return {"message": "If that email is registered and unverified, a new link has been sent."}
    if user.is_verified:
        return {"message": "This account is already verified. Please sign in."}

    token = _gen_token()
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    user.verification_token = token
    user.verification_expires = expires
    await db.commit()

    await email_service.send_verification_email(user.email, user.username, token)
    return {"message": "Verification email resent. Please check your inbox."}


# ─────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────
@router.post("/login", response_model=Token)
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    ok = bool(user and verify_password(data.password, user.hashed_password))

    if not ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    # Update MongoDB login history (non-fatal)
    try:
        from app.models.mongo_user import UserProfile, LoginEvent
        from app.db.mongodb import is_connected
        if is_connected():
            profile = await UserProfile.find_one(UserProfile.sqlite_user_id == user.id)
            if profile:
                ip = request.client.host if request.client else "unknown"
                ua = request.headers.get("user-agent", "")[:120]
                profile.login_history.append(LoginEvent(ip=ip, user_agent=ua))
                # Keep last 50 logins
                if len(profile.login_history) > 50:
                    profile.login_history = profile.login_history[-50:]
                profile.usage_stats.last_active = datetime.now(timezone.utc)
                await profile.save()

                # Login notification (first login of the day, or new IP)
                recent_ips = {e.ip for e in profile.login_history[-5:] if e.ip != ip}
                if ip not in recent_ips:
                    await email_service.send_login_notification(user.email, user.username, ip, ua)
    except Exception:
        pass

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


# ─────────────────────────────────────────────
# FORGOT PASSWORD
# ─────────────────────────────────────────────
class ForgotRequest(BaseModel):
    email: EmailStr

@router.post("/forgot-password")
async def forgot_password(data: ForgotRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    # Always return same message to avoid email enumeration
    if user and user.is_active:
        token = _gen_token()
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        user.reset_token = token
        user.reset_expires = expires
        await db.commit()
        await email_service.send_password_reset_email(user.email, user.username, token)
    return {"message": "If that email is registered, a password reset link has been sent."}


# ─────────────────────────────────────────────
# RESET PASSWORD
# ─────────────────────────────────────────────
class ResetRequest(BaseModel):
    token: str
    new_password: str

@router.post("/reset-password")
async def reset_password(data: ResetRequest, db: AsyncSession = Depends(get_db)):
    if len(data.new_password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    result = await db.execute(select(User).where(User.reset_token == data.token))
    user = result.scalar_one_or_none()

    if not user or not user.reset_expires:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if datetime.now(timezone.utc) > user.reset_expires.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_expires = None
    await db.commit()
    return {"message": "Password reset successfully. You can now sign in."}


# ─────────────────────────────────────────────
# CHANGE PASSWORD (authenticated)
# ─────────────────────────────────────────────
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.put("/password")
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=422, detail="New password must be at least 8 characters")
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"detail": "Password updated successfully"}


# ─────────────────────────────────────────────
# GET CURRENT USER (authenticated)
# ─────────────────────────────────────────────
@router.get("/me", response_model=Token)
async def get_me(current_user: User = Depends(get_current_user)):
    token = create_access_token({"sub": str(current_user.id)})
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(current_user))


# ─────────────────────────────────────────────
# GOOGLE OAUTH
# ─────────────────────────────────────────────
@router.get("/google")
async def google_auth_url():
    """Return the Google OAuth authorization URL."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env")
    params = urllib.parse.urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
    })
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.get("/google/callback")
async def google_callback(
    code: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Google redirects here with ?code=... after user approves."""
    if error or not code:
        return RedirectResponse(url=f"{settings.APP_URL}/login?error=google_denied", status_code=302)

    # Exchange code for access token
    async with httpx.AsyncClient(timeout=10) as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            return RedirectResponse(url=f"{settings.APP_URL}/login?error=google_token_failed", status_code=302)

        google_access_token = token_resp.json().get("access_token")
        if not google_access_token:
            return RedirectResponse(url=f"{settings.APP_URL}/login?error=google_no_token", status_code=302)

        # Get Google user info
        info_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if info_resp.status_code != 200:
            return RedirectResponse(url=f"{settings.APP_URL}/login?error=google_userinfo_failed", status_code=302)
        ginfo = info_resp.json()

    google_id = ginfo.get("id", "")
    email = ginfo.get("email", "")
    name = ginfo.get("name", "")
    picture = ginfo.get("picture", "")

    if not email or not google_id:
        return RedirectResponse(url=f"{settings.APP_URL}/login?error=google_no_email", status_code=302)

    # Find or create user
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        # Check if email already exists (link accounts)
        result2 = await db.execute(select(User).where(User.email == email))
        user = result2.scalar_one_or_none()
        if user:
            user.google_id = google_id
            user.profile_picture = picture
            user.is_verified = True
        else:
            # Create new user — derive username from email, make unique
            base_username = email.split("@")[0].replace(".", "_").replace("+", "_")[:30]
            username = base_username
            i = 1
            while (await db.execute(select(User).where(User.username == username))).scalar_one_or_none():
                username = f"{base_username}{i}"
                i += 1

            user = User(
                username=username,
                email=email,
                hashed_password=hash_password(secrets.token_urlsafe(32)),  # random — Google users can't login with PW
                google_id=google_id,
                profile_picture=picture,
                is_verified=True,
            )
            db.add(user)
    else:
        user.profile_picture = picture  # refresh avatar on each login

    try:
        await db.commit()
        await db.refresh(user)
    except Exception:
        await db.rollback()
        return RedirectResponse(url=f"{settings.APP_URL}/login?error=google_db_error", status_code=302)

    # Create MongoDB profile (non-fatal)
    try:
        from app.models.mongo_user import UserProfile
        from app.db.mongodb import is_connected
        if is_connected():
            existing = await UserProfile.find_one(UserProfile.sqlite_user_id == user.id)
            if not existing:
                await UserProfile(
                    email=email,
                    username=user.username,
                    sqlite_user_id=user.id,
                ).insert()
    except Exception:
        pass

    # Issue JWT and redirect to frontend
    jwt_token = create_access_token({"sub": str(user.id)})
    return RedirectResponse(
        url=f"{settings.APP_URL}/auth/google/callback?token={jwt_token}",
        status_code=302,
    )
