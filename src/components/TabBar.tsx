import { NavLink } from 'react-router-dom';
import { Icon } from './ui/Icon';

/** Barre d'onglets en bas d'écran, avec le bouton d'ajout au centre. */
export function TabBar() {
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  return (
    <div className="tabbar">
      <nav aria-label="Navigation principale">
        <NavLink to="/" end className={cls}><Icon name="home" /> Accueil</NavLink>
        <NavLink to="/journal" className={({ isActive }) => (isActive || location.hash.startsWith('#/notes') ? 'active' : '')}><Icon name="list" /> Journal</NavLink>
        <NavLink to="/tache/nouvelle" className="add" aria-label="Nouvelle tâche"><span className="plus"><Icon name="plus" size={26} /></span></NavLink>
        <NavLink to="/bilans" className={cls}><Icon name="chart" /> Bilans</NavLink>
        <NavLink to="/dossier" className={cls}><Icon name="file" /> Dossier</NavLink>
      </nav>
    </div>
  );
}
