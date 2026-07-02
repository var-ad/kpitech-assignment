from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    name: str = Field(..., max_length=255, min_length=1)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
