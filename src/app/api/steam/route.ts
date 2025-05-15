/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import axios from "axios"

// Necesitarás configurar estas variables de entorno
const STEAM_API_KEY = process.env.STEAM_API_KEY
const STEAM_USER_ID = process.env.STEAM_USER_ID

// URLs de la API de Steam
const PLAYER_SUMMARIES_URL = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`
const RECENTLY_PLAYED_URL = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/`
const OWNED_GAMES_URL = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/`

// GTA 5 AppID
const GTA5_APPID = "271590"

// Caché para las imágenes de los juegos (evita descargar la misma imagen varias veces)
const imageCache: Record<string, string> = {}

async function getPlayerSummary() {
  try {
    console.log("Fetching player summary...")
    const response = await axios.get(PLAYER_SUMMARIES_URL, {
      params: {
        key: STEAM_API_KEY,
        steamids: STEAM_USER_ID,
      },
    })

    if (
      response.data &&
      response.data.response &&
      response.data.response.players &&
      response.data.response.players.length > 0
    ) {
      const player = response.data.response.players[0]
      console.log("Player data retrieved:", player.personaname)
      return player
    }

    console.error("No player data found in response")
    return null
  } catch (error) {
    console.error("Error fetching player summary:", error)
    return null
  }
}

async function getRecentlyPlayedGames() {
  try {
    console.log("Fetching recently played games...")
    const response = await axios.get(RECENTLY_PLAYED_URL, {
      params: {
        key: STEAM_API_KEY,
        steamid: STEAM_USER_ID,
        count: 10, // Increased to get more recent games
      },
    })

    if (
      response.data &&
      response.data.response &&
      response.data.response.games &&
      response.data.response.games.length > 0
    ) {
      console.log(`Found ${response.data.response.games.length} recently played games`)

      // Log all recently played games for debugging
      response.data.response.games.forEach((game: any, index: number) => {
        console.log(
          `Recent game ${index + 1}: ${game.name} (AppID: ${game.appid}), Playtime: ${game.playtime_forever} minutes`,
        )
      })

      return response.data.response.games
    }

    console.log("No recently played games found")
    return []
  } catch (error) {
    console.error("Error fetching recently played games:", error)
    return []
  }
}

async function getOwnedGames() {
  try {
    console.log("Fetching owned games...")
    const response = await axios.get(OWNED_GAMES_URL, {
      params: {
        key: STEAM_API_KEY,
        steamid: STEAM_USER_ID,
        include_appinfo: true,
        include_played_free_games: true,
      },
    })

    if (
      response.data &&
      response.data.response &&
      response.data.response.games &&
      response.data.response.games.length > 0
    ) {
      console.log(`Found ${response.data.response.games.length} owned games`)

      // Check if GTA 5 is in the owned games
      const gta5 = response.data.response.games.find((game: any) => game.appid.toString() === GTA5_APPID)
      if (gta5) {
        console.log(`Found GTA 5 in owned games: ${gta5.name}, Playtime: ${gta5.playtime_forever} minutes`)
      } else {
        console.log("GTA 5 not found in owned games")
      }

      return response.data.response.games
    }

    console.log("No owned games found")
    return []
  } catch (error) {
    console.error("Error fetching owned games:", error)
    return []
  }
}

// Función para encontrar un juego específico en la lista de juegos
function findGameById(games: any[], appId: string) {
  return games.find((game) => game.appid.toString() === appId.toString())
}

async function loadImageB64(url: string) {
  // Verificar si la imagen ya está en caché
  if (imageCache[url]) {
    return imageCache[url]
  }

  try {
    console.log(`Loading image from: ${url}`)
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    })
    const buffer = Buffer.from(response.data)
    const base64Image = buffer.toString("base64")

    // Guardar en caché
    imageCache[url] = base64Image

    return base64Image
  } catch (error) {
    console.error("Error loading image:", error)
    throw error
  }
}

// Formatear el tiempo de juego en formato horas:minutos
function formatPlaytime(minutes: number): string {
  if (!minutes || minutes === 0) {
    return "0:00"
  }

  // Calcular horas completas
  const hours = Math.floor(minutes / 60)
  // Calcular minutos restantes
  const remainingMinutes = Math.floor(minutes % 60)
  // Formatear minutos con ceros a la izquierda si es necesario
  const formattedMinutes = remainingMinutes < 10 ? `0${remainingMinutes}` : remainingMinutes

  return `${hours}:${formattedMinutes}`
}

function getLastPlayedText(timestamp: number): string {
  if (!timestamp) return "Never"

  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp

  // Si se jugó hoy
  if (diff < 86400) {
    return "Today"
  }

  // Si se jugó ayer
  if (diff < 172800) {
    return "Yesterday"
  }

  // Si se jugó en la última semana
  if (diff < 604800) {
    const days = Math.floor(diff / 86400)
    return `${days} days ago`
  }

  // Si se jugó hace más tiempo
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Logo de Steam en SVG
const steamLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 233 233" fill="#ffffff"><path d="M104.515 105.037L147.175 98.6195C149.817 98.1007 152.515 99.6639 153.033 102.306C153.552 104.948 151.989 107.646 149.347 108.165L106.687 114.582C104.045 115.101 101.347 113.538 100.828 110.896C100.31 108.254 101.873 105.556 104.515 105.037Z" fill="#ffffff"/><path d="M181.286 71.4286C181.286 88.5338 167.391 102.429 150.286 102.429C133.181 102.429 119.286 88.5338 119.286 71.4286C119.286 54.3234 133.181 40.4286 150.286 40.4286C167.391 40.4286 181.286 54.3234 181.286 71.4286Z" stroke="#ffffff" strokeWidth="12"/><path d="M113.714 161.429C113.714 178.534 99.8195 192.429 82.7143 192.429C65.6091 192.429 51.7143 178.534 51.7143 161.429C51.7143 144.323 65.6091 130.429 82.7143 130.429C99.8195 130.429 113.714 144.323 113.714 161.429Z" stroke="#ffffff" strokeWidth="12"/><path d="M116.5 0.5C179.513 0.5 231 52.4868 231 116C231 179.513 179.513 231.5 116.5 231.5C53.4868 231.5 2 179.513 2 116C2 52.4868 53.4868 0.5 116.5 0.5Z" stroke="#ffffff" strokeWidth="3"/><path d="M174.657 56.1786C185.96 56.1786 195.157 65.3755 195.157 76.6786C195.157 87.9816 185.96 97.1786 174.657 97.1786C163.354 97.1786 154.157 87.9816 154.157 76.6786C154.157 65.3755 163.354 56.1786 174.657 56.1786Z" fill="#ffffff"/><path d="M82.7143 146.429C90.4524 146.429 96.7143 152.691 96.7143 160.429C96.7143 168.167 90.4524 174.429 82.7143 174.429C74.9762 174.429 68.7143 168.167 68.7143 160.429C68.7143 152.691 74.9762 146.429 82.7143 146.429Z" fill="#ffffff"/></svg>`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateCurrentlyPlayingSVG(playerData: any, gameData: any) {
  // Obtener la URL de la imagen del juego
  const gameHeaderUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameData.appid}/header.jpg`

  // Obtener la URL del avatar del usuario
  const avatarUrl = playerData.avatarmedium || playerData.avatar

  // Cargar las imágenes en base64
  let gameHeader, userAvatar
  try {
    gameHeader = await loadImageB64(gameHeaderUrl)

    if (avatarUrl) {
      userAvatar = await loadImageB64(avatarUrl)
    }
  } catch (error) {
    console.error("Error loading images:", (error as Error).message)
    // Usar una imagen de fallback si no se puede cargar la imagen
    if (!gameHeader) gameHeader = ""
    if (!userAvatar) userAvatar = ""
  }

  // Formatear el tiempo de juego
  const playtime = formatPlaytime(gameData.playtime_forever || 0)

  // Icono de reloj
  const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#acdbf5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`

  // Obtener el nombre de usuario
  const username = playerData.personaname || "Steam User"

  return `
    <svg width="320" height="150" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Now playing on Steam</title>
      <foreignObject width="320" height="150">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            div {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            }

            .container {
              position: relative;
              overflow: hidden;
              height: 150px;
              border-radius: 8px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .background-image {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: url('data:image/jpeg;base64, ${gameHeader}');
              background-size: cover;
              background-position: center;
              z-index: 1;
            }
            
            .vignette {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: radial-gradient(circle, transparent 50%, rgba(0, 0, 0, 0.3) 100%);
              z-index: 2;
            }
            
            .header {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              padding: 10px 15px;
              box-sizing: border-box;
              z-index: 4;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .status-indicator {
              display: flex;
              align-items: center;
              background-color: rgba(0, 0, 0, 0.5);
              padding: 5px 10px;
              border-radius: 20px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .status-dot {
              width: 8px;
              height: 8px;
              background-color: #1db954;
              border-radius: 50%;
              margin-right: 6px;
              animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
              0% {
                transform: scale(0.95);
                opacity: 0.8;
              }
              50% {
                transform: scale(1.1);
                opacity: 1;
              }
              100% {
                transform: scale(0.95);
                opacity: 0.8;
              }
            }
            
            .status-text {
              color: #ffffff;
              font-size: 12px;
              font-weight: 500;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
            
            .user-info {
              display: flex;
              align-items: center;
              background-color: rgba(0, 0, 0, 0.5);
              padding: 4px;
              padding-right: 10px;
              border-radius: 20px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .user-avatar {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              margin-right: 6px;
              border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            .steam-logo-small {
              margin-right: 6px;
            }
            
            .username {
              color: #ffffff;
              font-size: 12px;
              font-weight: 500;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
            
            .footer {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              background: linear-gradient(to top, rgba(23, 35, 46, 0.95), rgba(27, 40, 56, 0.8));
              padding: 15px;
              box-sizing: border-box;
              z-index: 3;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
            }
            
            .game-info {
              display: flex;
              flex-direction: column;
            }
            
            .game-name {
              color: #ffffff;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
            
            .last-played {
              color: #8f98a0;
              font-size: 13px;
              text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
            }
            
            .playtime {
              display: flex;
              align-items: center;
              color: #ffffff;
              font-size: 14px;
              background-color: rgba(0, 0, 0, 0.3);
              padding: 6px 10px;
              border-radius: 4px;
              text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
            }
            
            .clock-icon {
              margin-right: 6px;
              filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
            }
          </style>
          
          <div class="background-image"></div>
          <div class="vignette"></div>
          
          <div class="header">
            <div class="status-indicator">
              <div class="status-dot"></div>
              <div class="status-text">Playing now</div>
            </div>
            
            <div class="user-info">
              ${userAvatar ? `<img src="data:image/jpeg;base64, ${userAvatar}" class="user-avatar" alt="${username}" />` : `<div class="steam-logo-small">${steamLogoSvg}</div>`}
              <div class="username">${username}</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="game-info">
              <div class="game-name">${gameData.name}</div>
              <div class="last-played">Now Playing</div>
            </div>
            
            <div class="playtime">
              <span class="clock-icon">${clockIcon}</span>
              ${playtime}
            </div>
          </div>
        </div>
      </foreignObject>
    </svg>
  `
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateRecentlyPlayedSVG(gameData: any, playerData: any) {
  // Obtener la URL de la imagen del juego
  const gameHeaderUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameData.appid}/header.jpg`

  // Obtener la URL del avatar del usuario
  const avatarUrl = playerData.avatarmedium || playerData.avatar

  // Cargar las imágenes en base64
  let gameHeader, userAvatar
  try {
    gameHeader = await loadImageB64(gameHeaderUrl)

    if (avatarUrl) {
      userAvatar = await loadImageB64(avatarUrl)
    }
  } catch (error) {
    console.error("Error loading images:", (error as Error).message)
    // Usar una imagen de fallback si no se puede cargar la imagen
    if (!gameHeader) gameHeader = ""
    if (!userAvatar) userAvatar = ""
  }

  // Formatear el tiempo de juego
  const totalPlaytime = formatPlaytime(gameData.playtime_forever || 0)

  // Obtener el texto de última sesión
  const lastPlayed = getLastPlayedText(gameData.rtime_last_played)

  // Icono de reloj
  const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#acdbf5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`

  // Obtener el nombre de usuario
  const username = playerData.personaname || "Steam User"

  return `
    <svg width="320" height="150" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Recently played on Steam</title>
      <foreignObject width="320" height="150">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            div {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            }

            .container {
              position: relative;
              overflow: hidden;
              height: 150px;
              border-radius: 8px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .background-image {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: url('data:image/jpeg;base64, ${gameHeader}');
              background-size: cover;
              background-position: center;
              z-index: 1;
            }
            
            .vignette {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: radial-gradient(circle, transparent 50%, rgba(0, 0, 0, 0.3) 100%);
              z-index: 2;
            }
            
            .header {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              padding: 10px 15px;
              box-sizing: border-box;
              z-index: 4;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .status-indicator {
              display: flex;
              align-items: center;
              background-color: rgba(0, 0, 0, 0.5);
              padding: 5px 10px;
              border-radius: 20px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .status-dot {
              width: 8px;
              height: 8px;
              background-color: #ccc;
              border-radius: 50%;
              margin-right: 6px;
            }
            
            .status-text {
              color: #ffffff;
              font-size: 12px;
              font-weight: 500;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
            
            .user-info {
              display: flex;
              align-items: center;
              background-color: rgba(0, 0, 0, 0.5);
              padding: 4px;
              padding-right: 10px;
              border-radius: 20px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .user-avatar {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              margin-right: 6px;
              border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            .steam-logo-small {
              margin-right: 6px;
            }
            
            .username {
              color: #ffffff;
              font-size: 12px;
              font-weight: 500;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
            
            .footer {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              background: linear-gradient(to top, rgba(23, 35, 46, 0.95), rgba(27, 40, 56, 0.8));
              padding: 15px;
              box-sizing: border-box;
              z-index: 3;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
            }
            
            .game-info {
              display: flex;
              flex-direction: column;
            }
            
            .game-name {
              color: #ffffff;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
            
            .last-played {
              color: #8f98a0;
              font-size: 13px;
              text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
            }
            
            .playtime {
              display: flex;
              align-items: center;
              color: #ffffff;
              font-size: 14px;
              background-color: rgba(0, 0, 0, 0.3);
              padding: 6px 10px;
              border-radius: 4px;
              text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
            }
            
            .clock-icon {
              margin-right: 6px;
              filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
            }
          </style>
          
          <div class="background-image"></div>
          <div class="vignette"></div>
          
          <div class="header">
            <div class="status-indicator">
              <div class="status-dot"></div>
              <div class="status-text">Recently played</div>
            </div>
            
            <div class="user-info">
              ${userAvatar ? `<img src="data:image/jpeg;base64, ${userAvatar}" class="user-avatar" alt="${username}" />` : `<div class="steam-logo-small">${steamLogoSvg}</div>`}
              <div class="username">${username}</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="game-info">
              <div class="game-name">${gameData.name}</div>
              <div class="last-played">Last played: ${lastPlayed}</div>
            </div>
            
            <div class="playtime">
              <span class="clock-icon">${clockIcon}</span>
              ${totalPlaytime}
            </div>
          </div>
        </div>
      </foreignObject>
    </svg>
  `
}

function generateErrorSVG() {
  return `
    <svg width="320" height="150" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Steam Error</title>
      <foreignObject width="320" height="150">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            div {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            }

            .container {
              background: linear-gradient(to bottom, #1b2838, #171e26);
              padding: 15px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100%;
              box-sizing: border-box;
              border-radius: 8px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .steam-logo {
              margin-bottom: 15px;
              opacity: 0.7;
            }

            .error-message {
              color: #ff1616;
              font-weight: bold;
              text-align: center;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
          </style>
          <div class="steam-logo">
            ${steamLogoSvg}
          </div>
          <div class="error-message">
            Error connecting to Steam
          </div>
        </div>
      </foreignObject>
    </svg>
  `
}

export async function GET() {
  try {
    console.log("Starting Steam widget generation...")

    // Obtener datos del jugador y juegos
    const [playerData, recentGames, ownedGames] = await Promise.all([
      getPlayerSummary(),
      getRecentlyPlayedGames(),
      getOwnedGames(),
    ])

    if (!playerData) {
      console.error("No player data found")
      return new NextResponse(generateErrorSVG(), {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=1",
        },
      })
    }

    // Verificar si el jugador está jugando actualmente
    if (playerData.gameextrainfo && playerData.gameid) {
      console.log(`Currently playing: ${playerData.gameextrainfo} (AppID: ${playerData.gameid})`)

      // Buscar información adicional del juego en los juegos recientes y propios
      let gameInfo = null

      // Primero buscar en juegos recientes (tiene información de tiempo de juego reciente)
      if (recentGames && recentGames.length > 0) {
        gameInfo = findGameById(recentGames, playerData.gameid)
      }

      // Si no se encuentra en juegos recientes, buscar en juegos propios
      if (!gameInfo && ownedGames && ownedGames.length > 0) {
        gameInfo = findGameById(ownedGames, playerData.gameid)
      }

      // Si aún no tenemos información, crear un objeto básico
      if (!gameInfo) {
        gameInfo = {
          appid: playerData.gameid,
          name: playerData.gameextrainfo,
          playtime_forever: 0,
        }
        console.log("No additional game info found, using basic info")
      } else {
        console.log(`Found additional game info: ${gameInfo.playtime_forever} minutes total playtime`)
      }

      const svg = await generateCurrentlyPlayingSVG(playerData, gameInfo)

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=1",
        },
      })
    }

    // Si no está jugando, intentar mostrar GTA 5 específicamente
    console.log("No game currently playing, checking for GTA 5...")

    // Buscar GTA 5 en juegos propios
    let gta5Game = null

    if (ownedGames && ownedGames.length > 0) {
      gta5Game = findGameById(ownedGames, GTA5_APPID)
    }

    // Si encontramos GTA 5, mostrarlo
    if (gta5Game) {
      console.log("Found GTA 5 in owned games, displaying it")

      // Buscar información adicional en juegos recientes
      if (recentGames && recentGames.length > 0) {
        const recentGta5 = findGameById(recentGames, GTA5_APPID)
        if (recentGta5) {
          console.log("GTA 5 found in recent games, using that data")
          gta5Game = {
            ...gta5Game,
            ...recentGta5,
          }
        }
      }

      const svg = await generateRecentlyPlayedSVG(gta5Game, playerData)

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=1",
        },
      })
    }

    // Si no encontramos GTA 5, mostrar el juego más reciente
    console.log("GTA 5 not found or not accessible, showing most recent game")

    if (recentGames && recentGames.length > 0) {
      // Obtener el juego más reciente
      const mostRecentGame = recentGames[0]
      console.log(`Recently played: ${mostRecentGame.name} (${mostRecentGame.playtime_forever} minutes total)`)

      const svg = await generateRecentlyPlayedSVG(mostRecentGame, playerData)

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=1",
        },
      })
    }

    // Si no hay juegos recientes pero hay juegos propios
    if (ownedGames && ownedGames.length > 0) {
      // Ordenar por tiempo de juego y obtener el más jugado
      const sortedGames = [...ownedGames].sort((a, b) => b.playtime_forever - a.playtime_forever)
      const mostPlayedGame = sortedGames[0]

      console.log(`No recent games, showing most played: ${mostPlayedGame.name}`)

      const svg = await generateRecentlyPlayedSVG(mostPlayedGame, playerData)

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=1",
        },
      })
    }

    // Si no hay juegos recientes ni propios
    console.log("No games found")
    return new NextResponse(generateErrorSVG(), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=1",
      },
    })
  } catch (error) {
    console.error("Error generating Steam widget:", error)
    return new NextResponse(generateErrorSVG(), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=1",
      },
    })
  }
}
