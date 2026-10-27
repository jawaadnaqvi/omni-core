from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Annotated

from app.core.database import get_db
from app.core.security import create_access_token, ALGORITHM
from app.core.config import settings
from . import schemas, service

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Yeh batata hai ke token kahan se aayega (Header mein Bearer token)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# --- 1. REGISTER ROUTE ---
@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return service.create_user(db=db, user=user)

# --- 2. LOGIN ROUTE ---
@router.post("/login")
def login_user(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm mein username field hoti hai, hum usme email bhejenge
    user = service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Login successful, token banao
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- 3. GET CURRENT USER (Protected Route) ---
def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = service.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: Annotated[schemas.UserResponse, Depends(get_current_user)]):
    return current_user