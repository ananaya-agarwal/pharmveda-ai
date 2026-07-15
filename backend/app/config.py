from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite:///./pharmveda.db"
    upload_dir: str = "./uploads"
    chroma_dir: str = "./chroma_data"

    jwt_secret: str = "change-me-to-a-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # Comma-separated list of allowed frontend origins for CORS. In production the
    # frontend is served from a different domain than the API, so this must include
    # its real origin (e.g. https://pharmveda.example.app).
    frontend_origins: str = "http://localhost:5173"
    # Cross-origin cookies require SameSite=None + Secure (HTTPS) - browsers reject
    # SameSite=None over plain HTTP, so this must stay False for local http dev and
    # be turned on only once the app is served over HTTPS.
    cookie_secure: bool = False

    llm_provider: str = "ollama"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"

    hosted_llm_api_key: str = ""
    hosted_llm_provider: str = "gemini"
    hosted_llm_model: str = "gemini-1.5-flash"

    tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    @property
    def frontend_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()
