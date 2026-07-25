# Stages du Master CSMI

Ce dépôt est le modèle des sites annuels qui regroupent les sujets, rapports et
présentations de stage des étudiants de M1 et M2 CSMI.

Les données sources de la scolarité, les notes, les numéros étudiants et les
adresses électroniques sont strictement privées. Elles ne doivent jamais être
ajoutées à ce dépôt public.

## Initialiser un nouveau dépôt annuel

Après avoir créé `master-csmi/csmi-stages-AAAA` depuis ce dépôt modèle :

```sh
git clone https://github.com/master-csmi/csmi-stages-AAAA.git
cd csmi-stages-AAAA
nvm install
nvm use
npm ci
npm run init:year -- AAAA
```

La commande met à jour la seule configuration annuelle,
[`config/site.json`](config/site.json), puis régénère `antora.yml` et
`site.yml`.

Compléter ensuite [`data/students.yml`](data/students.yml). Ce manifeste public
accepte uniquement les champs suivants :

- `level` : `m1` ou `m2` ;
- `last_name` et `first_name` ;
- `company`, `company_url` et `subject`, qui peuvent rester vides ;
- `file_stem`, uniquement pour remplacer exceptionnellement le nom de fichier
  calculé automatiquement ;
- `report_visibility` et `slides_visibility` : `public` par défaut, ou
  `confidential` ;
- `report_url` et `slides_url` lorsqu'un document public est hébergé ailleurs.

Le générateur affiche « à venir » tant qu'un PDF public n'est pas présent. Il ne
crée donc jamais de lien cassé vers un document non déposé.

## Commandes

```sh
npm ci                 # installation reproductible
npm run configure      # régénère les fichiers Antora depuis config/site.json
npm run generate       # régénère les listes M1 et M2
npm run check          # validation complète et construction du site
npm run serve          # sert public/ sur un serveur local
```

La construction échoue en cas d'avertissement Antora, de fichier de scolarité
versionné, de PDF mal nommé, de PDF non déclaré ou de PDF supérieur à la limite
définie dans `config/site.json`.

## Paramètres GitHub à appliquer au dépôt annuel

Les paramètres GitHub ne sont pas copiés par un dépôt modèle. Après la première
construction réussie :

1. activer GitHub Pages depuis la branche `gh-pages` ;
2. connecter le site Netlify si les aperçus de Pull Request sont souhaités ;
3. protéger `main` avec la CI obligatoire et une approbation ;
4. privilégier le *squash merge* et supprimer automatiquement les branches
   fusionnées ;
5. vérifier que seuls les responsables CSMI peuvent fusionner.

Le workflow annuel attendu pour les étudiants est documenté sur la page
« Instructions de dépôt » du site.
