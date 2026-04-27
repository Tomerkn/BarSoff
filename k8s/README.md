# Barsuf - מדריך פריסה בקוברנטיס (Kubernetes)

קובץ זה מסביר כיצד להריץ את מערכת ברסוף בתוך קונטיינרים בסביבת קוברנטיס.

### דרישות מקדימות
1. קלאסטר קוברנטיס פעיל.
2. כלי kubectl מותקן.
3. Docker מותקן לבניית התמונות.

### שלב 1: בניית תמונות Docker
יש להריץ את הפקודות הבאות מהתיקייה הראשית:

```bash
# בניית השרת
docker build -t barsuf-backend:latest -f Dockerfile.backend .

# בניית האתר
docker build -t barsuf-frontend:latest -f Dockerfile.frontend .
```

### שלב 2: פריסה לקלאסטר
יש להחיל את הקבצים לפי הסדר הבא:

```bash
# יצירת Namespace
kubectl apply -f k8s/namespace.yaml

# הגדרת אחסון קבוע
kubectl apply -f k8s/pvcs.yaml

# פריסת שרת
kubectl apply -f k8s/backend.yaml

# פריסת אתר
kubectl apply -f k8s/frontend.yaml
```

### שלב 3: גישה למערכת
לאחר סיום הפריסה, המערכת תהיה זמינה בפורט 30080 בכתובת המקומית (localhost).

### הסברים על קבצי הפריסה
* namespace.yaml: הפרדה לוגית של המערכת בתוך הקלאסטר.
* pvcs.yaml: בקשת אחסון עבור מסד הנתונים והקבצים של המערכת.
* backend.yaml: הגדרות ההרצה של צד השרת.
* frontend.yaml: הגדרות ההרצה של צד הלקוח וחשיפתו לגישה חיצונית.

הערה: המערכת אינה דורשת יותר את Ollama מאחר ועברנו להשתמש ב-Google Gemini API.
