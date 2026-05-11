const fs = require('fs');
let code = fs.readFileSync('src/pages/dashboard/AlertsPage.tsx', 'utf8');

const regexFetch = /const fetchAlerts = useCallback\(async \(\) => \{[\s\S]*?\}, \[filter\]\);\s*useEffect\(\(\) => \{ fetchAlerts\(\); \}, \[fetchAlerts\]\);/m;

const replacement = \
    useEffect(() => {
        setLoading(true);
        const unsub = alertService.subscribe({ severity: filter !== "All" ? filter : undefined }, (data) => {
            setAlerts(data);
            setLoading(false);
        });
        return () => unsub();
    }, [filter]);
\;

code = code.replace(regexFetch, replacement);
fs.writeFileSync('src/pages/dashboard/AlertsPage.tsx', code);
