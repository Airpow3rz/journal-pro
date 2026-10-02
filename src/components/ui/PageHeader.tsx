import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

/** En-tête de page : bouton retour facultatif, titre, actions, accès aux paramètres. */
export function PageHeader({ title, back, actions, settings = true }: { title: ReactNode; back?: boolean; actions?: ReactNode; settings?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back && (
        <button className="btn icon ghost" aria-label="Retour"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
          <Icon name="back" />
        </button>
      )}
      <h1>{title}</h1>
      {actions}
      {settings && (
        <Link to="/parametres" className="btn icon ghost" aria-label="Paramètres"><Icon name="gear" /></Link>
      )}
    </header>
  );
}
