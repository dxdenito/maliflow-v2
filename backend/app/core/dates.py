from datetime import date, timedelta

MONTH_PATTERN = r"^(19|20)\d{2}-(0[1-9]|1[0-2])$"


def month_bounds(period: date) -> tuple[date, date]:
    start = period.replace(day=1)
    end = (start + timedelta(days=32)).replace(day=1)
    return start, end


def parse_month(month: str | None) -> date | None:
    if month is None:
        return None
    year, month_number = month.split("-")
    return date(int(year), int(month_number), 1)