"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
import base64

def favicon_view(request):
    # Safe 1x1 transparent fallback to satisfy browser requests without throwing a 404
    tiny_icon = base64.b64decode(b'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
    return HttpResponse(tiny_icon, content_type='image/gif')

def api_welcome_view(request):
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Simply Useful ERP - API Gateway</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg: #09090b;
                --card-bg: #18181b;
                --primary: #3b82f6;
                --primary-glow: rgba(59, 130, 246, 0.15);
                --text: #f4f4f5;
                --text-muted: #a1a1aa;
                --border: #27272a;
                --success: #22c55e;
            }
            body {
                margin: 0;
                padding: 0;
                font-family: 'Outfit', sans-serif;
                background-color: var(--bg);
                color: var(--text);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                overflow: hidden;
            }
            .grid-bg {
                position: absolute;
                inset: 0;
                background-image: 
                    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                background-size: 40px 40px;
                z-index: 1;
            }
            .glow {
                position: absolute;
                width: 400px;
                height: 400px;
                background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 2;
                pointer-events: none;
            }
            .container {
                position: relative;
                z-index: 3;
                background: rgba(24, 24, 27, 0.85);
                border: 1px solid var(--border);
                border-radius: 24px;
                padding: 48px;
                max-width: 600px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                backdrop-filter: blur(12px);
                transition: transform 0.3s ease, border-color 0.3s ease;
            }
            .container:hover {
                transform: translateY(-4px);
                border-color: #3f3f46;
            }
            .badge {
                background: rgba(34, 197, 94, 0.1);
                color: var(--success);
                border: 1px solid rgba(34, 197, 94, 0.2);
                border-radius: 9999px;
                padding: 6px 16px;
                font-size: 14px;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 24px;
            }
            .badge-dot {
                width: 8px;
                height: 8px;
                background-color: var(--success);
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            h1 {
                font-size: 36px;
                font-weight: 800;
                margin: 0 0 12px 0;
                background: linear-gradient(to right, #ffffff, #a1a1aa);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            p {
                color: var(--text-muted);
                font-size: 16px;
                margin: 0 0 32px 0;
                line-height: 1.6;
            }
            .links {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .link-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(39, 39, 42, 0.5);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 16px 24px;
                text-decoration: none;
                color: var(--text);
                font-weight: 600;
                transition: all 0.2s ease;
            }
            .link-card:hover {
                background: var(--primary);
                border-color: var(--primary);
                transform: translateX(4px);
            }
            .link-card span.desc {
                font-size: 13px;
                font-weight: 400;
                color: var(--text-muted);
                transition: color 0.2s ease;
            }
            .link-card:hover span.desc {
                color: rgba(255,255,255,0.8);
            }
            @keyframes pulse {
                0% { transform: scale(0.95); opacity: 0.5; }
                50% { transform: scale(1.15); opacity: 1; }
                100% { transform: scale(0.95); opacity: 0.5; }
            }
        </style>
    </head>
    <body>
        <div class="grid-bg"></div>
        <div class="glow"></div>
        <div class="container">
            <div class="badge">
                <span class="badge-dot"></span>
                API Gateway Online
            </div>
            <h1>Simply Useful ERP</h1>
            <p>Welcome to the Django backend REST service module. All client handshakes, database records, and transaction logs are fully functional.</p>
            <div class="links">
                <a href="/api/v1/health" class="link-card" target="_blank">
                    <div style="text-align: left;">
                        <div>System Health Check</div>
                        <span class="desc">Verify API & Database health metrics</span>
                    </div>
                    <div>➔</div>
                </a>
                <a href="/admin/" class="link-card" target="_blank">
                    <div style="text-align: left;">
                        <div>Django Administration</div>
                        <span class="desc">Manage users, models, and metadata</span>
                    </div>
                    <div>➔</div>
                </a>
            </div>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html_content, content_type='text/html')

urlpatterns = [
    path('', api_welcome_view, name='api-welcome'),
    path('favicon.ico', favicon_view, name='favicon'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')),
]
