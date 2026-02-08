export default function TestPage() {
    return (
        <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
            <h1 style={{ color: '#0070f3' }}>✅ Test Page</h1>
            <p style={{ fontSize: '18px' }}>Si vous voyez cette page, Next.js fonctionne correctement !</p>
            <hr style={{ margin: '20px 0' }} />
            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
            </div>
            <hr style={{ margin: '20px 0' }} />
            <h2>Prochaines étapes :</h2>
            <ol>
                <li>Testez <code>/api/health</code> pour vérifier les variables d'environnement</li>
                <li>Testez <code>/login</code> pour vérifier l'authentification</li>
                <li>Vérifiez les logs Vercel Functions si des erreurs persistent</li>
            </ol>
        </div>
    );
}
