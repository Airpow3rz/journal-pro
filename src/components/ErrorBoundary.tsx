// Affiche un message lisible plutôt qu'un écran blanc si un écran plante.
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <h1>Oups</h1>
        <p>Une erreur inattendue s’est produite. Vos données ne sont pas perdues.</p>
        <pre className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
        <button className="btn primary" onClick={() => { location.hash = '#/'; location.reload(); }}>Revenir à l’accueil</button>
      </div>
    );
  }
}
