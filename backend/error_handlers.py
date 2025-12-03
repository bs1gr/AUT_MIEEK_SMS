from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
import logging


def _problem_details(status_code: int, title: str, detail, request: Request, type_uri: str = None, errors: list = None):
    return {
        "type": type_uri or "about:blank",
        "title": title,
        "status": status_code,
        "detail": detail,
        "instance": str(getattr(request, "url", "")),
        "errors": errors,
    }


def register_error_handlers(app):
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        det = exc.detail
        try:
            import json
            json.dumps(det)
        except Exception:
            det = str(det)
        body = _problem_details(
            status_code=exc.status_code,
            title="HTTP Exception",
            detail=det,
            request=request,
            type_uri=f"https://httpstatuses.com/{exc.status_code}",
        )
        return JSONResponse(status_code=exc.status_code, content=body, headers=getattr(exc, "headers", None) or {})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        raw_errs = exc.errors() if hasattr(exc, "errors") else None
        def _sanitize_error(e):
            e = dict(e)
            ctx = e.get("ctx")
            if isinstance(ctx, dict):
                err_obj = ctx.get("error")
                if isinstance(err_obj, BaseException):
                    ctx = dict(ctx)
                    ctx["error"] = str(err_obj)
                    e["ctx"] = ctx
            return e
        errs = [_sanitize_error(e) for e in (raw_errs or [])]
        body = _problem_details(
            status_code=422,
            title="Validation Error",
            detail=errs,
            request=request,
            type_uri="https://example.net/problems/validation-error",
            errors=errs,
        )
        return JSONResponse(status_code=422, content=body)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logging.exception("Unhandled application error", exc_info=exc)
        body = _problem_details(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            title="Internal Server Error",
            detail="An unexpected error occurred.",
            request=request,
            type_uri="https://example.net/problems/internal-server-error",
        )
        return JSONResponse(status_code=HTTP_500_INTERNAL_SERVER_ERROR, content=body)
