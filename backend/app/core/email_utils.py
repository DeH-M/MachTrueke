from typing import Tuple
from email_validator import validate_email, EmailNotValidError
import dns.resolver

def normalize_and_validate_format(raw_email: str) -> Tuple[str, str]:
    """
    Normaliza y valida formato del email.
    Devuelve (email_normalizado, dominio).
    Lanza ValueError si no es válido.
    """
    try:
        v = validate_email(raw_email, check_deliverability=False)  # formato + normalización
        email = v.email.lower().strip()
        domain = email.split("@", 1)[1]
        return email, domain
    except EmailNotValidError as e:
        raise ValueError(str(e))

def domain_has_mx(domain: str) -> bool:
    """
    Comprueba si el dominio tiene registros MX (DNS).
    """
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        return len(answers) > 0
    except Exception:
        return False
