# Un espace pour souffler

Un espace de discussion avec une IA, pensé pour les coups de stress — pas pour remplacer un suivi professionnel, mais pour offrir une écoute immédiate, bienveillante, et sans jugement.

**Démo en ligne : [soutien-ia.vercel.app](https://soutien-ia.vercel.app)**

## Pourquoi

Un proche traverse parfois un coup de stress au moment où personne n'est disponible pour en parler. Ce projet propose une interface de chat simple, accessible par un lien, où l'on peut écrire ce qu'on ressent et recevoir une réponse empathique en quelques secondes.

## Ce qui est fait

- **Chat en streaming** avec un modèle Gemini, via une route API Next.js
- **Garde-fous de sécurité** : le prompt système oriente vers des ressources professionnelles (3114, SAMU, SOS Amitié) en cas de détresse sévère évoquée, sans jamais remplacer un avis médical
- **Aucune persistance serveur** : les conversations restent en mémoire du navigateur, jamais stockées côté backend
- **Interface sombre et apaisante** : fond qui "respire" (halos animés en boucle douce), verre dépoli, dégradés discrets
- **Ambiance sonore lofi générative** : un moteur audio synthétisé en temps réel (Web Audio API) — groove de batterie swingué, accords façon Rhodes, vibrato de bande, souffle et crépitements de vinyle. Comme rien n'est un fichier audio en boucle, le son ne se répète jamais à l'identique

## Stack technique

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [`@google/genai`](https://www.npmjs.com/package/@google/genai) pour les réponses du modèle Gemini
- Web Audio API pure (aucune dépendance audio externe) pour l'ambiance sonore
- Déployé sur [Vercel](https://vercel.com)

## Lancer le projet en local

```bash
npm install
cp .env.local.example .env.local   # puis ajouter votre clé GEMINI_API_KEY
npm run dev
```

La clé Gemini est gratuite, sans carte bancaire, via [Google AI Studio](https://aistudio.google.com).

## Structure

```
app/
  api/chat/route.ts   # route API qui appelle Gemini en streaming
  page.tsx             # interface de chat
lib/
  systemPrompt.ts       # prompt système (ton, garde-fous de sécurité)
  useAmbientSound.ts     # moteur audio génératif (lofi)
```

## Avertissement

Cet outil ne remplace pas un professionnel de santé. En cas de danger immédiat, contactez le **3114** (numéro national de prévention du suicide, gratuit, 24h/24) ou le **15** (SAMU).
