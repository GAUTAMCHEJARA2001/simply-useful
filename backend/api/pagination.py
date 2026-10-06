import math
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class StandardResultsSetPagination(PageNumberPagination):
    """
    Enterprise Standard Pagination for Django REST Framework.
    Guarantees consistent JSON envelope across all list endpoints:
    - Provides both 'data' and 'results' for 100% backwards compatibility with frontend.
    - Provides 'meta' object with total, page, pageSize, totalPages, and navigation links.
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 500

    def get_paginated_response(self, data):
        total_items = self.page.paginator.count
        page_size = self.get_page_size(self.request) or self.page_size
        total_pages = math.ceil(total_items / page_size) if page_size > 0 else 1
        current_page = self.page.number

        return Response({
            'success': True,
            'data': data,
            'results': data,
            'count': total_items,
            'message': 'Success',
            'meta': {
                'total': total_items,
                'count': total_items,
                'page': current_page,
                'pageSize': page_size,
                'totalPages': total_pages,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
            }
        })
