# Journal Pro

Journal de travail professionnel, **100 % local**, pour constituer au fil de l'année un dossier factuel en vue d'une négociation (augmentation, requalification de poste).

- Saisie d'une tâche en moins de 30 secondes, avec des modèles favoris et un bouton « Dupliquer ».
- Bloc-notes en markdown, que l'on peut relier à des tâches.
- Bilans hebdomadaires, mensuels, trimestriels et annuels générés automatiquement.
- Dossier de négociation en PDF et export CSV.
- Fonctionne hors ligne et s'installe sur iPhone et sur Mac (PWA).

## Confidentialité

- **Aucun serveur, aucun compte, aucune télémétrie.** Les données sont enregistrées uniquement dans le navigateur de l'appareil (IndexedDB).
- Seul le *code* de l'application est publié sur GitHub Pages. Vos *données* ne quittent jamais votre téléphone ou votre Mac, sauf quand vous exportez vous-même une sauvegarde.
- Anonymisez vos saisies : pas de noms de clients ni d'informations sensibles. Indiquez une fonction (« manager », « équipe boutique ») plutôt qu'un nom.

---

## 1. Lancer l'application sur le Mac (développement)

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent (version « LTS »).

```bash
cd journal-pro
npm install
npm run dev
```

Ouvrez ensuite l'adresse affichée (par défaut http://localhost:5173).

Autres commandes :

| Commande | Rôle |
|---|---|
| `npm test` | Tests automatiques (jours fériés, série, périodes, statistiques, PDF…) |
| `npm run build` | Version optimisée dans le dossier `dist/` |
| `npm run preview` | Sert la version optimisée en local |
| `npm run icons` | Régénère les icônes de l'app |

## 2. Publier sur GitHub Pages (une seule fois)

L'iPhone n'autorise l'installation et le mode hors ligne qu'en **HTTPS**. GitHub Pages fournit cette adresse gratuitement.

1. Créez un dépôt sur GitHub, par exemple `journal-pro`. Il peut être **privé** si votre offre GitHub permet Pages sur les dépôts privés, sinon public : il ne contient que du code, aucune donnée.
2. Depuis le dossier `journal-pro` :
   ```bash
   git init
   git add .
   git commit -m "Première version"
   git branch -M main
   git remote add origin https://github.com/<votre-utilisateur>/journal-pro.git
   git push -u origin main
   ```
3. Sur GitHub, ouvrez **Settings → Pages**, puis dans « Build and deployment », choisissez **Source : GitHub Actions**.
4. Le fichier `.github/workflows/deploy.yml` compile et publie l'app automatiquement à chaque `git push`. Suivez l'avancement dans l'onglet **Actions**.
5. L'app est disponible à l'adresse `https://<votre-utilisateur>.github.io/journal-pro/`.

Pour publier une mise à jour, faites `git push` : l'app installée se met à jour toute seule à la prochaine ouverture avec une connexion Internet.

## 3. Installer sur iPhone (appareil principal)

1. Ouvrez l'adresse GitHub Pages dans **Safari** (obligatoirement Safari).
2. Touchez le bouton **Partager**, puis **« Sur l'écran d'accueil »**, puis **Ajouter**.
3. Lancez l'app depuis son icône : elle s'ouvre en plein écran et fonctionne hors ligne.

> ⚠️ **Utilisez toujours l'icône de l'écran d'accueil**, pas l'onglet Safari. Ce sont deux stockages séparés. Safari peut effacer les données d'un site non visité pendant 7 jours, mais une app ajoutée à l'écran d'accueil n'est pas concernée.

## 4. Installer sur Mac

- **Safari (macOS Sonoma ou plus récent)** : menu **Fichier → Ajouter au Dock**.
- **Chrome / Edge** : icône d'installation dans la barre d'adresse.

Le Mac a son propre stockage, séparé de l'iPhone (voir ci-dessous).

## 5. Sauvegarder ses données

L'iPhone est l'appareil **principal**. Il n'y a pas de synchronisation automatique, c'est un choix de confidentialité.

**Sauvegarde mensuelle (rappel automatique dans l'app)**

1. **Paramètres → Sauvegarde des données → Exporter une sauvegarde (JSON)**.
2. Sur iPhone, choisissez **« Enregistrer dans Fichiers »**, par exemple dans iCloud Drive ou « Sur mon iPhone ».
3. Le fichier contient tout : tâches, notes, bilans, réglages et pièces jointes.

**Restaurer, ou consulter ses données sur le Mac**

1. Transférez le fichier `.json` (AirDrop, iCloud Drive…).
2. Dans l'app : **Paramètres → Importer une sauvegarde**, puis choisissez :
   - **Remplacer** : efface les données de l'appareil et restaure exactement la sauvegarde ;
   - **Fusionner** : ajoute ce qui manque ; en cas de doublon, la version modifiée le plus récemment l'emporte.

Pour garder une seule source de vérité, saisissez sur l'iPhone et ne faites que des imports sur le Mac (mode « Remplacer »).

## 6. Utilisation

| Écran | Contenu |
|---|---|
| **Accueil** | Bouton « + Tâche », modèles favoris, série de jours ouvrés consécutifs, aperçu de la semaine, rappels |
| **Journal** | Toutes les tâches par jour, recherche plein texte (sans tenir compte des accents), filtres (période, catégorie, hors fiche, tags, étoile), export CSV ; onglet **Notes** |
| **Bilans** | Semaine / mois / trimestre / année : chiffres, répartition, % hors fiche et évolution, initiatives, retours, réflexions. Le trimestre reprend les bilans mensuels, l'année les trimestriels |
| **Dossier** | Choix et ordre du Top 10 (tâches étoilées ★), génération du PDF |
| **Paramètres** ⚙︎ | Fiche de poste, catégories, modèles, jours fériés, thème, sauvegarde |

**Série de jours consécutifs.** Seuls les jours ouvrés comptent (lundi au vendredi). Les week-ends, les jours fériés (France par défaut, ou Belgique, Luxembourg, Genève) et les jours non travaillés que vous ajoutez (ponts, congés) ne cassent pas la série. Une journée en cours sans saisie ne la casse pas non plus.

**Bannière du vendredi.** À partir du vendredi 16 h et jusqu'au dimanche, « Faire le bilan de la semaine » s'affiche tant que le bilan n'est pas marqué comme fait.

**Champ « Compétences ».** Il peut être désactivé dans les Paramètres.

**Dossier PDF.** Il contient : une synthèse avec les chiffres clés, la fiche de poste contractuelle comparée aux tâches réelles, le Top 10 des réalisations, les retours positifs avec renvoi vers les annexes, les compétences développées, une section « Ma demande » à compléter, et les annexes (captures intégrées, PDF joints ajoutés en fin de document).

## 7. Organisation du code

```
src/
├── db/          # Modèle de données (schema.ts), base Dexie, écritures, sauvegarde JSON
├── lib/         # Logique pure et testée : dates, jours fériés, jours ouvrés/série,
│                #   périodes, statistiques, recherche, CSV, rappels
├── pdf/         # Données du dossier (data.ts), mise en page (Dossier.tsx), assemblage
├── hooks/       # Accès réactif aux données
├── components/  # Composants d'interface réutilisables
├── pages/       # Écrans
└── styles/      # Thème clair/sombre et styles
```

Pour faire évoluer le modèle de données, ajoutez une version dans `src/db/db.ts` (`this.version(2).stores({...}).upgrade(...)`), puis augmentez `SCHEMA_VERSION` dans `src/db/schema.ts`.
