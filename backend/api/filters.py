import datetime

FY_START_MONTH = 4

def fy_date_filter(request, queryset, date_field='date'):
    """
    Apply an optional date range filter from query params.
    Accepts:
      ?fy=2024-25           — April 1 2024 to March 31 2025 (exclusive end = April 1 2025)
      ?quarter=Q1           — Filter by fiscal quarter (can combine with ?fy, or defaults to current FY)
      ?start=2024-04-01&end=2025-04-01  — explicit ISO dates (endExclusive)
    If neither param is present, returns the queryset unchanged.
    """
    if not request or not hasattr(request, 'query_params'):
        return queryset

    fy_param = request.query_params.get('fy')
    quarter_param = request.query_params.get('quarter')
    start_param = request.query_params.get('start')
    end_param = request.query_params.get('end')
    quarter = None

    if quarter_param:
        q_str = str(quarter_param).strip().upper()
        if q_str.startswith('Q'):
            q_str = q_str[1:]
        try:
            q_val = int(q_str)
            if 1 <= q_val <= 4:
                quarter = q_val
        except ValueError:
            pass

    if (fy_param or quarter) and (not (start_param or end_param)):
        try:
            if fy_param:
                start_year = int(fy_param.split('-')[0])
            else:
                today = datetime.date.today()
                if today.month < FY_START_MONTH:
                    start_year = today.year - 1
                else:
                    start_year = today.year
            if quarter:
                start_month = (FY_START_MONTH - 1 + (quarter - 1) * 3) % 12 + 1
                start_year_offset = 1 if start_month < FY_START_MONTH else 0
                filter_start = datetime.date(start_year + start_year_offset, start_month, 1)
                if quarter == 4:
                    next_month = FY_START_MONTH
                    next_year_offset = 1
                else:
                    next_month = (FY_START_MONTH - 1 + quarter * 3) % 12 + 1
                    next_year_offset = 1 if next_month < FY_START_MONTH else 0
                filter_end = datetime.date(start_year + next_year_offset, next_month, 1)
            else:
                filter_start = datetime.date(start_year, FY_START_MONTH, 1)
                filter_end = datetime.date(start_year + 1, FY_START_MONTH, 1)

            filter_kwargs = {
                f"{date_field}__gte": filter_start,
                f"{date_field}__lt": filter_end,
            }
            return queryset.filter(**filter_kwargs)
        except Exception:
            return queryset

    if start_param or end_param:
        try:
            filter_kwargs = {}
            if start_param:
                filter_kwargs[f"{date_field}__gte"] = start_param
            if end_param:
                filter_kwargs[f"{date_field}__lt"] = end_param
            return queryset.filter(**filter_kwargs)
        except Exception:
            return queryset

    return queryset
