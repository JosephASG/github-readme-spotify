import { NextResponse } from "next/server"
import axios from "axios"

// Necesitarás configurar estas variables de entorno
const STEAM_API_KEY = process.env.STEAM_API_KEY
const STEAM_USER_ID = process.env.STEAM_USER_ID

// URLs de la API de Steam
const PLAYER_SUMMARIES_URL = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`
const RECENTLY_PLAYED_URL = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/`

// Caché para las imágenes de los juegos (evita descargar la misma imagen varias veces)
const imageCache: Record<string, string> = {}

async function getPlayerSummary() {
  try {
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
      return response.data.response.players[0]
    }

    return null
  } catch (error) {
    console.error("Error fetching player summary:", error)
    return null
  }
}

async function getRecentlyPlayedGames() {
  try {
    const response = await axios.get(RECENTLY_PLAYED_URL, {
      params: {
        key: STEAM_API_KEY,
        steamid: STEAM_USER_ID,
        count: 5, // Obtener los 5 juegos más recientes
      },
    })

    if (
      response.data &&
      response.data.response &&
      response.data.response.games &&
      response.data.response.games.length > 0
    ) {
      return response.data.response.games
    }

    return []
  } catch (error) {
    console.error("Error fetching recently played games:", error)
    return []
  }
}

async function loadImageB64(url: string) {
  // Verificar si la imagen ya está en caché
  if (imageCache[url]) {
    return imageCache[url]
  }

  try {
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

function formatPlaytime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutos`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} horas`
  }

  return `${hours} horas y ${remainingMinutes} minutos`
}

function generateGameBars() {
  let bars = ""
  for (let i = 0; i < 30; i++) {
    bars += `<div class="bar"></div>`
  }
  return bars
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateCurrentlyPlayingSVG(playerData: any, gameData: any) {
  // Obtener la URL de la imagen del juego
  const gameHeaderUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameData.appid}/header.jpg`

  // Cargar las imágenes en base64
  let gameHeader
  try {
    gameHeader = await loadImageB64(gameHeaderUrl)
  } catch (error) {
    console.error("Error loading game header, using fallback:", (error as Error).message)
    // Usar una imagen de fallback si no se puede cargar la imagen del juego
    gameHeader = ""
  }

  // Formatear el tiempo de juego
  const playtime = formatPlaytime(gameData.playtime_2weeks || 0)

  // Generar barras para el visualizador
  const bars = generateGameBars()

  // Logo de Steam en SVG
  const steamLogoSvg = `<svg stroke="currentColor" fill="#66c0f4" strokeWidth="0" viewBox="0 0 496 512" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.6-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 39.2 0 71.9-32.4 70.2-73.5l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256zM155.7 384.3l-30.5-12.6a52.79 52.79 0 0 0 27.2 25.8c26.9 11.2 57.8-1.6 69-28.4 5.4-13 5.5-27.3.1-40.3-5.4-13-15.5-23.2-28.5-28.6-12.9-5.4-26.7-5.2-38.9-.6l31.5 13c19.8 8.2 29.2 30.9 20.9 50.7-8.3 19.9-31 29.2-50.8 21zm173.8-129.9c-34.4 0-62.4-28-62.4-62.3s28-62.3 62.4-62.3 62.4 28 62.4 62.3-27.9 62.3-62.4 62.3zm.1-15.6c25.9 0 46.9-21 46.9-46.8 0-25.9-21-46.8-46.9-46.8s-46.9 21-46.9 46.8c.1 25.8 21.1 46.8 46.9 46.8z"></path></svg>`

  return `
    <svg width="320" height="470" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Now playing on Steam</title>
      <foreignObject width="320" height="470">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            div {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            }

            .container {
              background-color: #1b2838;
              border-radius: 10px;
              padding: 10px 10px 20px 10px;
            }

            .playing {
              display: flex;
              justify-content: center;
              align-items: center;
              color: #66c0f4;
              font-weight: bold;
              text-align: center;
              margin-bottom: 8px;
            }

            .game-title {
              color: #fff;
              font-weight: bold;
              font-size: 20px;
              text-align: center;
              margin-bottom: 5px;
            }

            .playtime {
              color: #acdbf5;
              font-size: 16px;
              text-align: center;
              margin-bottom: 5px;
            }

            .logo {
              margin-left: 5px;
              height: 24px;
            }

            .cover {
              border-radius: 5px;
              margin-bottom: 10px;
            }

            .game-bar {
              height: 30px;
              position: relative;
              margin: 0 auto 15px auto;
              width: 300px;
              overflow: hidden;
              display: flex;
              justify-content: space-between;
            }

            .bar {
              background: #66c0f4;
              height: 15px;
              width: 5px;
              margin: 0 2px;
              border-radius: 1px;
              animation: pulse 1.5s ease-in-out infinite;
            }

            @keyframes pulse {
              0% {
                height: 5px;
                opacity: 0.5;
              }
              50% {
                height: 15px;
                opacity: 1;
              }
              100% {
                height: 5px;
                opacity: 0.5;
              }
            }

            .bar:nth-child(1) { animation-delay: 0.0s; }
            .bar:nth-child(2) { animation-delay: 0.1s; }
            .bar:nth-child(3) { animation-delay: 0.2s; }
            .bar:nth-child(4) { animation-delay: 0.3s; }
            .bar:nth-child(5) { animation-delay: 0.4s; }
            .bar:nth-child(6) { animation-delay: 0.5s; }
            .bar:nth-child(7) { animation-delay: 0.6s; }
            .bar:nth-child(8) { animation-delay: 0.7s; }
            .bar:nth-child(9) { animation-delay: 0.8s; }
            .bar:nth-child(10) { animation-delay: 0.9s; }
            .bar:nth-child(11) { animation-delay: 1.0s; }
            .bar:nth-child(12) { animation-delay: 1.1s; }
            .bar:nth-child(13) { animation-delay: 1.2s; }
            .bar:nth-child(14) { animation-delay: 1.3s; }
            .bar:nth-child(15) { animation-delay: 1.4s; }
            .bar:nth-child(16) { animation-delay: 0.0s; }
            .bar:nth-child(17) { animation-delay: 0.1s; }
            .bar:nth-child(18) { animation-delay: 0.2s; }
            .bar:nth-child(19) { animation-delay: 0.3s; }
            .bar:nth-child(20) { animation-delay: 0.4s; }
            .bar:nth-child(21) { animation-delay: 0.5s; }
            .bar:nth-child(22) { animation-delay: 0.6s; }
            .bar:nth-child(23) { animation-delay: 0.7s; }
            .bar:nth-child(24) { animation-delay: 0.8s; }
            .bar:nth-child(25) { animation-delay: 0.9s; }
            .bar:nth-child(26) { animation-delay: 1.0s; }
            .bar:nth-child(27) { animation-delay: 1.1s; }
            .bar:nth-child(28) { animation-delay: 1.2s; }
            .bar:nth-child(29) { animation-delay: 1.3s; }
            .bar:nth-child(30) { animation-delay: 1.4s; }
          </style>
          <div class="playing">
            Now playing on ${steamLogoSvg}
          </div>
          <div class="game-title">${gameData.name}</div>
          <div class="playtime">Tiempo jugado: ${playtime}</div>
          
          <div class="game-bar">
            ${bars}
          </div>

          <a href="https://store.steampowered.com/app/${gameData.appid}" target="_BLANK">
            <center>
              <img src="data:image/jpeg;base64, ${gameHeader}" width="300" height="140" class="cover" />
            </center>
          </a>
        </div>
      </foreignObject>
    </svg>
  `
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateRecentlyPlayedSVG(gameData: any) {
  // Obtener la URL de la imagen del juego
  const gameHeaderUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameData.appid}/header.jpg`

  // Cargar las imágenes en base64
  let gameHeader
  try {
    gameHeader = await loadImageB64(gameHeaderUrl)
  } catch (error) {
    console.error("Error loading game header, using fallback:", (error as Error).message)
    // Usar una imagen de fallback si no se puede cargar la imagen del juego
    gameHeader = ""
  }

  // Formatear el tiempo de juego
  const playtime = formatPlaytime(gameData.playtime_2weeks || gameData.playtime_forever || 0)

  // Logo de Steam en SVG
  const steamLogoSvg = `<svg stroke="currentColor" fill="#66c0f4" strokeWidth="0" viewBox="0 0 496 512" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.6-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 39.2 0 71.9-32.4 70.2-73.5l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256zM155.7 384.3l-30.5-12.6a52.79 52.79 0 0 0 27.2 25.8c26.9 11.2 57.8-1.6 69-28.4 5.4-13 5.5-27.3.1-40.3-5.4-13-15.5-23.2-28.5-28.6-12.9-5.4-26.7-5.2-38.9-.6l31.5 13c19.8 8.2 29.2 30.9 20.9 50.7-8.3 19.9-31 29.2-50.8 21zm173.8-129.9c-34.4 0-62.4-28-62.4-62.3s28-62.3 62.4-62.3 62.4 28 62.4 62.3-27.9 62.3-62.4 62.3zm.1-15.6c25.9 0 46.9-21 46.9-46.8 0-25.9-21-46.8-46.9-46.8s-46.9 21-46.9 46.8c.1 25.8 21.1 46.8 46.9 46.8z"></path></svg>`

  return `
    <svg width="320" height="320" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Recently played on Steam</title>
      <foreignObject width="320" height="320">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            div {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            }

            .container {
              background-color: #1b2838;
              border-radius: 10px;
              padding: 10px 10px 20px 10px;
            }

            .playing {
              display: flex;
              justify-content: center;
              align-items: center;
              color: #66c0f4;
              font-weight: bold;
              text-align: center;
              margin-bottom: 8px;
            }

            .game-title {
              color: #fff;
              font-weight: bold;
              font-size: 20px;
              text-align: center;
              margin-bottom: 5px;
            }

            .playtime {
              color: #acdbf5;
              font-size: 16px;
              text-align: center;
              margin-bottom: 15px;
            }

            .logo {
              margin-left: 5px;
              height: 24px;
            }

            .cover {
              border-radius: 5px;
              margin-bottom: 10px;
            }
          </style>
          <div class="playing">
            Recently played on ${steamLogoSvg}
          </div>
          <div class="game-title">${gameData.name}</div>
          <div class="playtime">Tiempo jugado: ${playtime}</div>

          <a href="https://store.steampowered.com/app/${gameData.appid}" target="_BLANK">
            <center>
              <img src="data:image/jpeg;base64, ${gameHeader}" width="300" height="140" class="cover" />
            </center>
          </a>
        </div>
      </foreignObject>
    </svg>
  `
}

function generateErrorSVG() {
  // Logo de Steam en SVG
  const steamLogoSvg = `<svg stroke="currentColor" fill="#66c0f4" strokeWidth="0" viewBox="0 0 496 512" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.6-76.3-239-180.4l95.2 39.3c6.4 32.1 34.9 56.4 68.9 56.4 39.2 0 71.9-32.4 70.2-73.5l84.5-60.2c52.1 1.3 95.8-40.9 95.8-93.5 0-51.6-42-93.5-93.7-93.5s-93.7 42-93.7 93.5v1.2L176.6 279c-15.5-.9-30.7 3.4-43.5 12.1L0 236.1C10.2 108.4 117.1 8 247.6 8 384.8 8 496 119 496 256zM155.7 384.3l-30.5-12.6a52.79 52.79 0 0 0 27.2 25.8c26.9 11.2 57.8-1.6 69-28.4 5.4-13 5.5-27.3.1-40.3-5.4-13-15.5-23.2-28.5-28.6-12.9-5.4-26.7-5.2-38.9-.6l31.5 13c19.8 8.2 29.2 30.9 20.9 50.7-8.3 19.9-31 29.2-50.8 21zm173.8-129.9c-34.4 0-62.4-28-62.4-62.3s28-62.3 62.4-62.3 62.4 28 62.4 62.3-27.9 62.3-62.4 62.3zm.1-15.6c25.9 0 46.9-21 46.9-46.8 0-25.9-21-46.8-46.9-46.8s-46.9 21-46.9 46.8c.1 25.8 21.1 46.8 46.9 46.8z"></path></svg>`

  return `
    <svg width="320" height="125" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Steam Error</title>
      <foreignObject width="320" height="125">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            div {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            }

            .container {
              background-color: #1b2838;
              border-radius: 10px;
              padding: 10px 10px
            }

            .playing {
              display: flex;
              justify-content: center;
              align-items: center;
              color: #ff1616;
              font-weight: bold;
              text-align: center;
              margin-bottom: 0;
            }

            .logo {
              margin-left: 5px;
            }
          </style>
          <div class="playing">
            Error connecting to Steam ${steamLogoSvg}
          </div>
        </div>
      </foreignObject>
    </svg>
  `
}

export async function GET() {
  try {
    console.log("Fetching Steam player data...")
    const playerData = await getPlayerSummary()

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
      console.log("Currently playing:", playerData.gameextrainfo)

      // Crear un objeto con la información del juego actual
      const currentGame = {
        appid: playerData.gameid,
        name: playerData.gameextrainfo,
        img_icon_url: "", // No tenemos esta información desde GetPlayerSummaries
        playtime_2weeks: 0, // No tenemos esta información desde GetPlayerSummaries
      }

      const svg = await generateCurrentlyPlayingSVG(playerData, currentGame)

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=1",
        },
      })
    }

    // Si no está jugando, obtener los juegos recientes
    console.log("No game currently playing, fetching recently played games")
    const recentGames = await getRecentlyPlayedGames()

    if (recentGames && recentGames.length > 0) {
      // Obtener el juego más reciente
      const mostRecentGame = recentGames[0]
      console.log("Recently played:", mostRecentGame.name)

      const svg = await generateRecentlyPlayedSVG(mostRecentGame)

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=1",
        },
      })
    }

    // Si no hay juegos recientes
    console.log("No recent games found")
    return new NextResponse(generateErrorSVG(), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=1",
      },
    })
  } catch (error) {
    console.error("Error generating Steam now playing:", error)
    return new NextResponse(generateErrorSVG(), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=1",
      },
    })
  }
}
