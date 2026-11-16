# Table de cartes (cartes-train)

Une table de cartes virtuelle : un lien, tout le monde voit le même jeu de 52 cartes (+ 2 jokers en option) sur son téléphone. Pas de compte, pas de règles imposées.

- Chaque joueur ne voit que sa propre main (le serveur n'envoie jamais les cartes des autres).
- Cartes posées face visible ou face cachée (seul celui qui l'a posée voit la sienne).
- Distribuer, piocher, mélanger, ramasser, nouvelle partie.
- Reconnexion automatique (tunnel, téléphone en veille) : on retrouve sa place et sa main.
- Jusqu'à 8 joueurs par table. Les tables abandonnées sont supprimées après 6 h.

## Tester chez soi
    npm install
    npm start
puis ouvrir http://localhost:3000 (pour tester avec un 2e onglet : ouvrir le lien de la table dans une fenêtre de navigation privée, qui a son propre joueur).

## Mettre en ligne (gratuit) avec Render
1. Crée un dépôt GitHub et envoie-y ces fichiers (sans `node_modules`).
2. Sur render.com : New > Web Service > choisis ton dépôt.
3. Runtime : Node. Build command : `npm install`. Start command : `npm start`. Offre : Free.
4. Une fois déployé, tu obtiens une adresse https://... : c'est elle que tu partages.

Sur l'offre gratuite, le serveur s'endort après un moment d'inactivité et met environ une minute à se réveiller. Ouvre le lien avant de monter dans le train, puis crée ta table.
Fly.io, Railway ou un petit VPS fonctionnent aussi : il suffit d'un hébergeur qui accepte les WebSocket.

## Limites connues
- L'état est en mémoire : si le serveur redémarre, les tables sont perdues.
- Pas de gestion de tour : c'est volontairement libre.
