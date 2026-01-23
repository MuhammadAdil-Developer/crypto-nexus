# Production Image Loading Fix - Summary

**Date:** 2026-01-23  
**Issue:** Product images not loading in production environment  
**Root Cause:** Hardcoded localhost URLs and missing production media serving configuration

## Changes Made

### 1. Backend Configuration (`backend/cryptonexus/settings.py`)

#### Added HTTPS & Proxy Settings
```python
# HTTPS & Proxy Settings
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
```

**Purpose:** Enable Django to properly handle proxy headers from reverse proxies (Nginx, Cloudflare, etc.) and construct correct URLs in production.

### 2. Backend URL Configuration (`backend/cryptonexus/urls.py`)

#### Updated Media/Static File Serving
```python
from django.urls import path, include, re_path
from django.views.static import serve

# Serve media and static files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    # Manual serving for production if no separate static server is configured
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
        re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
    ]
```

**Purpose:** Ensure Django serves media files in production when DEBUG=False (fallback if Nginx isn't configured).

### 3. Backend Serializers (`backend/products/serializers.py`)

#### Changed from Absolute to Relative URLs
**Before:**
```python
def get_main_image(self, obj):
    if not obj.main_image:
        return None
    request = self.context.get('request')
    if request:
        return request.build_absolute_uri(obj.main_image.url)
    return obj.main_image.url
```

**After:**
```python
def get_main_image(self, obj):
    """Return relative URL for main image"""
    if not obj.main_image:
        return None
    return obj.main_image.url
```

**Purpose:** Return relative URLs (e.g., `/media/products/images/image.jpg`) instead of absolute URLs. This allows the frontend to construct the correct URL based on the environment.

**Applied to:**
- `get_main_image()` in ProductSerializer
- `get_gallery_images()` in ProductSerializer
- `get_documents()` in ProductSerializer
- `get_main_image()` in ProductDetailSerializer
- `get_gallery_images()` in ProductDetailSerializer
- `get_documents()` in ProductDetailSerializer

### 4. Frontend - ProductCard Component (`client/src/components/buyer/ProductCard.tsx`)

#### Updated getProductImage Function
**Before:**
```typescript
const getProductImage = () => {
    if (product.main_image) {
      return product.main_image;
    }
    // ...
};
```

**After:**
```typescript
const getProductImage = () => {
    if (product.main_image) {
      return getImageUrl(product.main_image);
    }
    if (product.gallery_images && product.gallery_images.length > 0) {
      return getImageUrl(product.gallery_images[0]);
    }
    if (product.main_images && product.main_images.length > 0) {
      return getImageUrl(product.main_images[0]);
    }
    return placeholderImage;
};
```

**Purpose:** Use the `getImageUrl` helper to construct proper URLs for all environments.

### 5. Frontend - ProductDetailModal (`client/src/components/buyer/ProductDetailModal.tsx`)

#### Removed Hardcoded localhost URLs
**Before:**
```typescript
const imageUrl = image.startsWith('http') ? image : `http://localhost:8000${image}`;
const docUrl = doc.startsWith('http') ? doc : `http://localhost:8000${doc}`;
```

**After:**
```typescript
const imageUrl = getImageUrl(image);
const docUrl = getImageUrl(doc);
```

**Purpose:** Use environment-aware URL construction instead of hardcoded localhost.

### 6. Frontend - VendorListings (`client/src/pages/vendor/listings.tsx`)

#### Updated Product Thumbnails
**Before:**
```typescript
<img src={product.main_image || placeholderImage} />
```

**After:**
```typescript
<img src={getImageUrl(product.main_image) || placeholderImage} />
```

**Purpose:** Apply `getImageUrl` to vendor listing thumbnails in both mobile and desktop views.

### 7. Frontend - VendorEditProduct (`client/src/pages/vendor/edit-product.tsx`)

#### Fixed Image Previews
**Before:**
```typescript
const mainImgUrl = foundProduct.main_image.startsWith('http')
  ? foundProduct.main_image
  : `http://localhost:8000${foundProduct.main_image}`;
setMainImagePreview(mainImgUrl);
```

**After:**
```typescript
setMainImagePreview(getImageUrl(foundProduct.main_image));
```

**Purpose:** Use `getImageUrl` for consistent URL handling in edit mode.

## How getImageUrl Works

The `getImageUrl` helper function (`client/src/config/api.ts`) intelligently constructs URLs:

```typescript
export const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;  // Already absolute
  return `${API_BASE_URL_WITHOUT_API}${url}`;  // Prepend base URL
};
```

**Behavior:**
- **Development:** `http://localhost:8000/media/products/images/image.jpg`
- **Production:** `https://accountzclub.com/media/products/images/image.jpg`

## Environment Variables

### Frontend (`.env` or production config)
```env
VITE_API_BASE_URL=https://api.accountzclub.com/api/v1
# OR for same-domain deployment:
VITE_API_BASE_URL=https://accountzclub.com/api/v1
```

### Backend (environment variables)
```env
DEBUG=False
ALLOWED_HOSTS=accountzclub.com,api.accountzclub.com
CORS_ALLOWED_ORIGINS=https://accountzclub.com
```

## Testing Checklist

- [x] Product images load on buyer listings page
- [x] Product images load in product detail modal
- [x] Gallery images display correctly
- [x] Document downloads work
- [x] Vendor listings show product thumbnails
- [x] Vendor edit page shows existing images
- [x] Images work in both development and production
- [x] No hardcoded localhost URLs remain

## Files Modified

### Backend
1. `backend/cryptonexus/settings.py` - Added proxy settings
2. `backend/cryptonexus/urls.py` - Production media serving
3. `backend/products/serializers.py` - Relative URL serialization

### Frontend
1. `client/src/components/buyer/ProductCard.tsx` - getImageUrl usage
2. `client/src/components/buyer/ProductDetailModal.tsx` - Removed hardcoded URLs
3. `client/src/pages/vendor/listings.tsx` - getImageUrl for thumbnails
4. `client/src/pages/vendor/edit-product.tsx` - Fixed image previews

## Deployment Notes

### Option 1: Nginx Serving Media (Recommended)
Configure Nginx to serve media files directly:
```nginx
location /media/ {
    alias /path/to/crypto-nexus/backend/media/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### Option 2: Django Serving Media (Fallback)
The changes in `urls.py` allow Django to serve media files when DEBUG=False. This works but is less efficient than Nginx.

### Important
- Ensure `MEDIA_ROOT` directory has proper permissions
- Verify `USE_X_FORWARDED_HOST` is enabled if behind a proxy
- Set correct `ALLOWED_HOSTS` in production
- Configure CORS properly for cross-origin requests

## Verification Commands

```bash
# Check if media files exist
ls -la backend/media/products/images/

# Test API endpoint (should return relative URLs)
curl https://api.accountzclub.com/api/v1/products/ | jq '.data[0].main_image'

# Expected output: "/media/products/images/example.jpg"
# NOT: "http://localhost:8000/media/..."
```

## Rollback Plan

If issues occur, revert these commits:
1. Backend serializers change
2. Frontend getImageUrl implementations
3. Settings.py proxy configuration

The system will fall back to absolute URLs but may still have localhost issues.

## Future Improvements

1. **CDN Integration:** Move media files to a CDN (Cloudflare R2, AWS S3)
2. **Image Optimization:** Add automatic image resizing/compression
3. **Lazy Loading:** Implement progressive image loading
4. **WebP Conversion:** Convert images to WebP for better performance
5. **Caching Headers:** Add proper cache headers for media files

## Support

If images still don't load:
1. Check browser console for 404 errors
2. Verify `VITE_API_BASE_URL` is set correctly
3. Check Django logs for media file access errors
4. Ensure media directory permissions are correct (755 for dirs, 644 for files)
5. Verify reverse proxy (Nginx/Cloudflare) isn't blocking media requests
