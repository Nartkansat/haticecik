@echo off
echo ===================================================
echo     Senin Icin... Web Surumu Baslatiliyor
echo ===================================================
echo.
echo Tarayici otomatik olarak acilacak...
echo (Kapatmak istediginizde bu pencereyi kapatabilirsiniz)
echo.
start http://localhost:8000
python -m http.server 8000 --directory web

