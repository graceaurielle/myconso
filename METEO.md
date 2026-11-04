# Météo — Documentation technique

## Vue d'ensemble

Le module météo de myconso2 récupère les conditions météorologiques en temps réel via des APIs gratuites (sans clé), les affiche sur le dashboard, et enregistre l'historique des températures en base de données.

---

## Sources de données

### Météo : Open-Meteo
- **URL** : `https://api.open-meteo.com/v1/forecast`
- **Gratuit**, sans clé API, sans limite d'usage raisonnable
- **Paramètres récupérés** : température, température ressentie, humidité relative, précipitations, code météo WMO, vitesse du vent, fuseau horaire automatique

### Géocodage inverse : Nominatim (OpenStreetMap)
- **URL** : `https://nominatim.openstreetmap.org/reverse`
- **Gratuit**, sans clé API
- Convertit les coordonnées GPS (lat, lon) en nom de ville
- Réponse en français (`accept-language=fr`)

---

## Architecture

```
Dashboard JS
    │
    ├── navigator.geolocation.getCurrentPosition()
    │       └── succès → lat/lon de l'utilisateur
    │       └── échec  → lat/lon d'Abidjan (5.3599, -4.0082)
    │
    └── frappe.call('get_current_weather', {lat, lon})
            │
            └── api.py → Open-Meteo + Nominatim
                    │
                    ├── Retourne JSON au dashboard
                    └── Sauvegarde dans tabMeteorologie
```

---

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `myconso2/api.py` | Fonctions Python exposées (`get_current_weather`, `get_meteo_history`) |
| `myconso2/tasks.py` | Tâche scheduler : enregistrement horaire automatique |
| `myconso2/hooks.py` | Déclaration du scheduler (`hourly`) |
| `myconso2/doctype/meteorologie/` | DocType pour la table `tabMeteorologie` |
| `myconso2/page/tableau_de_bord/tableau_de_bord.js` | Carte météo du dashboard |

---

## Fonctions Python (`api.py`)

### `get_current_weather(lat, lon)`
Fonction principale, exposée via `@frappe.whitelist()`.

1. Appelle Open-Meteo avec les coordonnées fournies
2. Appelle Nominatim pour obtenir le nom de la ville
3. Traduit le code WMO en label français + emoji (via `_WMO_LABELS`)
4. Sauvegarde le résultat dans `tabMeteorologie` (avec déduplication)
5. Retourne le JSON structuré

**Réponse retournée :**
```json
{
  "city": "Abidjan",
  "latitude": 5.3599,
  "longitude": -4.0082,
  "temperature": 27.1,
  "feels_like": 31.5,
  "humidity": 81,
  "wind_speed": 9.2,
  "precipitation": 0.0,
  "weather_code": 3,
  "weather_label": "Couvert",
  "weather_icon": "☁️",
  "time": "2026-06-12T17:15"
}
```

### `get_meteo_history(date_from, date_to, limit)`
Retourne les enregistrements de `tabMeteorologie` filtrés par plage de dates, triés par date/heure décroissants.

### `_save_meteo_record(data)` *(privée)*
Insère un enregistrement dans `tabMeteorologie` après vérification des doublons.

**Règle de déduplication** : un enregistrement est ignoré s'il existe déjà un enregistrement avec la même date, la même heure (troncée à l'heure), et une position à moins de 0.2° de latitude/longitude.

---

## Codes météo WMO → Français

| Code | Description | Icône |
|---:|---|:---:|
| 0 | Ciel clair | ☀️ |
| 1 | Principalement dégagé | 🌤️ |
| 2 | Partiellement nuageux | ⛅ |
| 3 | Couvert | ☁️ |
| 45 | Brouillard | 🌫️ |
| 48 | Brouillard givrant | 🌫️ |
| 51 | Bruine légère | 🌦️ |
| 53 | Bruine modérée | 🌦️ |
| 55 | Bruine dense | 🌧️ |
| 61 | Pluie légère | 🌧️ |
| 63 | Pluie modérée | 🌧️ |
| 65 | Pluie forte | 🌧️ |
| 71 | Neige légère | 🌨️ |
| 73 | Neige modérée | 🌨️ |
| 75 | Neige forte | ❄️ |
| 77 | Grains de neige | ❄️ |
| 80 | Averses légères | 🌦️ |
| 81 | Averses modérées | 🌧️ |
| 82 | Averses violentes | 🌧️ |
| 85 | Averses de neige | 🌨️ |
| 86 | Averses de neige fortes | ❄️ |
| 95 | Orage | ⛈️ |
| 96 | Orage avec grêle légère | ⛈️ |
| 99 | Orage violent avec grêle | 🌩️ |

---

## Enregistrement automatique

### Deux déclencheurs

**1. Scheduler horaire (arrière-plan)**
- Frappe appelle `record_hourly_weather()` dans `tasks.py` toutes les heures
- Enregistre la météo d'Abidjan (coordonnées fixes) même si aucun utilisateur n'est connecté
- Résultat : **minimum 24 enregistrements par jour**

**2. Consultation du dashboard (à la demande)**
- À chaque ouverture du dashboard ou clic sur "Actualiser la météo"
- Enregistre la météo à la position réelle de l'utilisateur
- Soumis au cache de 10 minutes (pas de doublon si l'utilisateur rafraîchit rapidement)

### Table `tabMeteorologie` — champs

| Champ | Type | Description |
|---|---|---|
| `date_meteo` | Date | Date de la mesure |
| `heure_meteo` | Time | Heure de la mesure |
| `temperature` | Float | Température en °C |
| `temperature_ressentie` | Float | Ressenti en °C |
| `humidite` | Int | Humidité relative en % |
| `vitesse_vent` | Float | Vent en km/h |
| `precipitation` | Float | Précipitations en mm |
| `weather_code` | Int | Code WMO |
| `weather_label` | Data | Label en français |
| `weather_icon` | Data | Emoji météo |
| `ville` | Data | Nom de la ville |
| `latitude` | Float | Latitude (6 décimales) |
| `longitude` | Float | Longitude (6 décimales) |

---

## Cache côté client (localStorage)

| Clé | Durée | Contenu |
|---|---|---|
| `mc2_geo_cache` | 15 minutes | `{lat, lon, timestamp}` |
| `mc2_weather_cache` | 10 minutes | Réponse complète de `get_current_weather` + timestamp |

Le bouton **"Actualiser la météo"** force le rechargement des données météo (ignore le cache météo) mais conserve le cache de géolocalisation si celui-ci est encore valide.

---

## Position par défaut

Si l'utilisateur refuse la géolocalisation ou si le navigateur ne la supporte pas, les coordonnées d'**Abidjan** sont utilisées en fallback :
- Latitude : `5.3599`
- Longitude : `-4.0082`

Un message discret `"Position par défaut : Abidjan"` est affiché sous la température.
