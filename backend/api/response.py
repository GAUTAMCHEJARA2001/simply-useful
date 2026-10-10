from rest_framework.response import Response

def send_success(data=None, message='Done', status_code=200):
    return Response({'success': True, 'data': data, 'message': message}, status=status_code)

def send_error(message='Internal Server Error', status_code=500):
    return Response({'success': False, 'data': None, 'message': message}, status=status_code)
