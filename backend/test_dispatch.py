import requests, json

headers = {'Authorization': 'Bearer kiran', 'Content-Type': 'application/json'}
res = requests.get('http://localhost:4000/api/v1/sales', headers=headers)
orders = res.json().get('data', [])
if orders:
    order = orders[0]
    print("Order:", order.get("orderId"), "Status:", order.get("status"))
    print("Items:", order.get("items"))
    payload = {
        'items': [{'productId': order['items'][0]['product']['id'], 'qty': 1}],
        'invoiceNumber': 'INV-123',
        'vehicleNumber': 'MH01AB1234',
        'driverName': 'Test Driver',
        'driverMobile': '9999999999'
    }
    print('Dispatching...')
    res2 = requests.post(f'http://localhost:4000/api/v1/sales/{order["id"]}/partial-dispatch/', json=payload, headers=headers)
    print(res2.status_code)
    print(res2.text)
else:
    print('No orders found')
