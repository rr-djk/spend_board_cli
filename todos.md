# Todos

## Prochaine itération

- Corriger le parsing de l'année des transactions : quand l'app ne parvient pas à parser l'année d'une transaction (ex: relevé de 2010), elle applique par défaut l'année courante, ce qui donne des dates incorrectes. Il faudrait soit extraire l'année du contexte du relevé, soit marquer la transaction avec une année inconnue plutôt que de supposer l'année courante.
