from __future__ import annotations

from collections.abc import Iterator

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import SessionFactoryProvider
from app.services.analysis_service import AnalysisService
from app.services.report_service import ReportService


def database_session() -> Iterator[Session]:
    provider = SessionFactoryProvider()
    yield from provider()


def settings_dependency() -> Settings:
    return get_settings()


def get_analysis_service(
    session: Session = Depends(database_session),
    settings: Settings = Depends(settings_dependency),
) -> AnalysisService:
    return AnalysisService(session, settings)


def get_report_service(settings: Settings = Depends(settings_dependency)) -> ReportService:
    return ReportService(page_size=settings.report_page_size)


def public_base_url(request: Request, settings: Settings = Depends(settings_dependency)) -> str:
    if settings.report_public_base_url:
        return settings.report_public_base_url.rstrip("/")
    return str(request.base_url).rstrip("/")