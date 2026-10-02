// Liste « À faire » de l'accueil : on note en une ligne, on coche quand c'est fait.
// La coche ouvre le formulaire de tâche pré-rempli, pour vérifier avant d'enregistrer.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addTodos, deleteTodo, updateTodoText } from '../db/actions';
import type { Todo } from '../db/schema';
import { useOpenTodos } from '../hooks/data';
import { splitTodoLines } from '../lib/suggest';
import { Icon } from './ui/Icon';
import { useToast } from './ui/Toast';

export function TodoList() {
  const todos = useOpenTodos();
  const [draft, setDraft] = useState('');
  const navigate = useNavigate();

  const add = async (text: string) => {
    const lines = splitTodoLines(text);
    if (lines.length) await addTodos(lines);
    setDraft('');
  };

  return (
    <div className="card todo-card">
      <form className="row" onSubmit={(e) => { e.preventDefault(); add(draft); }}>
        <input type="text" value={draft} enterKeyHint="done" placeholder="Noter une chose à faire…"
          aria-label="Nouvelle chose à faire" onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            // Plusieurs lignes collées (ou dictées) = plusieurs éléments.
            const text = e.clipboardData.getData('text');
            if (/\r?\n/.test(text.trim())) { e.preventDefault(); add(text); }
          }} />
        <button type="submit" className="btn icon primary" aria-label="Ajouter" disabled={!draft.trim()}><Icon name="plus" /></button>
      </form>
      {todos && todos.length > 0 && (
        <ul className="todo-list">
          {todos.map((t) => <TodoItem key={t.id} todo={t} onCheck={() => navigate(`/tache/nouvelle?afaire=${t.id}`)} />)}
        </ul>
      )}
      {todos && todos.length === 0 && (
        <p className="hint" style={{ margin: '8px 2px 0' }}>Notez ici vos tâches à venir. Une fois faites, cochez-les : le formulaire s’ouvre déjà rempli.</p>
      )}
    </div>
  );
}

function TodoItem({ todo, onCheck }: { todo: Todo; onCheck: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(todo.text);
  const toast = useToast();

  const commit = async () => {
    setEditing(false);
    const clean = text.trim();
    if (!clean) { setText(todo.text); return; }
    if (clean !== todo.text) await updateTodoText(todo.id, clean);
  };
  const remove = async () => {
    await deleteTodo(todo.id);
    toast({ text: 'Élément retiré', action: { label: 'Annuler', run: () => { import('../db/db').then(({ db }) => db.todos.put(todo)); } } });
  };

  return (
    <li className="todo-item">
      <button className="todo-check" aria-label={`Fait : ${todo.text}`} onClick={onCheck}><Icon name="check" size={16} /></button>
      {editing ? (
        <input type="text" value={text} autoFocus onChange={(e) => setText(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setText(todo.text); setEditing(false); } }} />
      ) : (
        <span className="todo-text" onClick={() => setEditing(true)}>{todo.text}</span>
      )}
      <button className="btn icon ghost todo-del" aria-label={`Supprimer : ${todo.text}`} onClick={remove}><Icon name="x" size={16} /></button>
    </li>
  );
}
