import { NextResponse } from "next/server"
import { encode } from "base-64"
import axios from "axios"

// Spotify scopes:
//   user-read-currently-playing
//   user-read-recently-played
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_SECRET_ID = process.env.SPOTIFY_SECRET_ID
const SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN

const REFRESH_TOKEN_URL = "https://accounts.spotify.com/api/token"
const NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing"
const RECENTLY_PLAYED_URL = "https://api.spotify.com/v1/me/player/recently-played"

function getAuth() {
  const decode_token = encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_SECRET_ID}`)
  return decode_token
}

async function refreshToken() {
  try {
    const response = await axios.post(
      REFRESH_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SPOTIFY_REFRESH_TOKEN || "",
        client_id: SPOTIFY_CLIENT_ID || "",
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${getAuth()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    )
    return response.data.access_token
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error refreshing token:", error.response.data)
      throw new Error(`Failed to refresh token: ${JSON.stringify(error.response.data)}`)
    } else {
      console.error("Error refreshing token:", error)
      throw new Error(`Failed to refresh token: ${(error as Error).message}`)
    }
  }
}

async function recentlyPlayed() {
  try {
    const token = await refreshToken()
    const response = await axios.get(RECENTLY_PLAYED_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 204) {
        return { items: [] }
      }
      console.error("Error fetching recently played:", error.response.data)
    } else {
      console.error("Error fetching recently played:", error)
    }
    return { items: [] }
  }
}

async function nowPlaying() {
  try {
    const token = await refreshToken()
    const response = await axios.get(NOW_PLAYING_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 204) {
        console.log("No content from Spotify API (204)")
        return null
      }
      console.error("Error fetching now playing:", error.response.data)
    } else {
      console.error("Error fetching now playing:", error)
    }
    return null
  }
}

function generateBarCSS() {
  // Configuración para las barras
  const containerWidth = 300 // Ancho del contenedor en px
  const barWidth = 3 // Ancho de cada barra en px
  const barGap = 3 // Espacio entre barras en px
  const totalBarWidth = barWidth + barGap // Ancho total que ocupa cada barra con su espacio

  // Calculamos cuántas barras caben en el ancho disponible
  const numberOfBars = Math.floor(containerWidth / totalBarWidth)

  let css = ""

  for (let i = 0; i < numberOfBars; i++) {
    // Calculamos la posición exacta de cada barra
    const left = i * totalBarWidth
    // Duración de animación aleatoria entre 500ms y 1500ms
    const anim = Math.floor(Math.random() * 1000) + 500
    css += `.bar:nth-child(${i + 1}) { left: ${left}px; animation-duration: ${anim}ms; }\n`
  }

  return css
}

function generateBars() {
  // Usamos los mismos parámetros que en generateBarCSS para consistencia
  const containerWidth = 300
  const barWidth = 3
  const barGap = 3
  const totalBarWidth = barWidth + barGap

  // Calculamos cuántas barras caben en el ancho disponible
  const numberOfBars = Math.floor(containerWidth / totalBarWidth)

  let bars = ""

  for (let i = 0; i < numberOfBars; i++) {
    bars += `<div class="bar"></div>`
  }

  return bars
}

async function loadImageB64(url: string) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    })
    const buffer = Buffer.from(response.data)
    return buffer.toString("base64")
  } catch (error) {
    console.error("Error loading image:", error)
    throw error
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateNowPlayingSVG(item: any) {
  const image = await loadImageB64(item.album.images[0].url)
  const artistName = item.artists[0].name.replace(/&/g, "&amp;")
  const songName = item.name.replace(/&/g, "&amp;")
  const songUrl = item.external_urls.spotify

  // Generate CSS for bars
  const cssBar = generateBarCSS()

  // Generate bars HTML
  const contentBar = generateBars()

  // Set height based on whether we have an image or not
  const height = 470 // Height with image

  return `
    <svg width="320" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Now playing on Spotify</title>
      <foreignObject width="320" height="${height}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            div {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            }

            .container {
              background-color: #121212;
              border-radius: 10px;
              padding: 10px 10px 20px 10px;
            }

            .playing {
              display: flex;
              justify-content: center;
              align-items: center;
              color: #53b14f;
              font-weight: bold;
              text-align: center;
              margin-bottom: 8px;
            }

            .artist {
              color: #fff;
              font-weight: bold;
              font-size: 20px;
              text-align: center;
              margin-bottom: 5px;
            }

            .song {
              color: #b3b3b3;
              font-size: 16px;
              text-align: center;
              margin-bottom: 5px;
            }

            .logo {
              margin-left: 5px;
            }

            .cover {
              border-radius: 5px;
              margin-bottom: 10px;
            }

            #bars {
              height: 30px;
              position: relative;
              margin: 0 auto 15px auto;
              width: 300px;
              overflow: hidden;
            }

            .bar {
              background: #53b14f;
              bottom: 1px;
              height: 3px;
              position: absolute;
              width: 3px;
              animation: sound 0ms -800ms linear infinite alternate;
            }

            @keyframes sound {
              0% {
                opacity: .35;
                height: 3px;
              }

              100% {
                opacity: 1;
                height: 15px;
              }
            }

            ${cssBar}
          </style>
          <div class="playing">
            Now playing on <img class="logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAjCAYAAAAe2bNZAAAE5ElEQVRYR81WS08bVxQ+dzweY48fQCCBllJDmqpRSx6gKizSiAUbILZjA21KVEhF20hNlLb/IKu2m3QRKaqQogIRkAXhYQxFSJGCQqVKrVSBQtpCFqEQkrQhxnb8Yjxzp7oTmdjjsWd4LHIlLzz3PL57zvedexG8Qgu9Qlhg22Bqumr0+/L2VdAMOpBvtdgCoedBnhPvsw/YpcFLg9x2DrklMA19DVajkf4B0dQnAMDkSJgQedwfWot9fevcraBWYJrA1HXX5RUWWG8jhGq1Bk7aiVj8PfGfWOc754uq+aqCOXXT8bFOTw2oBVLb5zmhw9s6fj2XXU4wniFnF6LRF2qJtO6LPPQMN3s/zWafFcxuA0kCwILYO+IZO6sESBHMbrUmWwVwQjw70jLWK9/PAEPIuqfQFtNa+u3acU8wKyd1BhjPqPNXJdVgHkP8WRwiqxGI/RsDLsSBiEXQGXRgKDCAqcQk/RgbA4hS1QXx/WPYPVaTepg0LzJHTBZmcy5wQQ5mL89CeCUMIGqvAQFjLjeD/aQdiqqLsoKLh/nCiTMT68nIaWA8Q45riKY6k5szF2YgEU5oR5HFkn2dhUNfHQLjXmOaBRZw34jHRwaotNLANHtdG6mTdaF3AVZvrwJCCNgyFoqOFIHtgA2MxUbQGXXSdyxg4MM8RJ9EYf2vdfDf80PsaUyxkqSNtd+nzU1+yOXVZ4Ahd429pCzjTiG80MIBeVH4GA/Lk8uw/PMyEL4lV9XFKiiuLt78H/2Hy5u8OEmK8LIyjb2Nbxvz9Qu5eiIKokTcuD8OfISXTk+zNOQV5r0grk6ZuIGFAMxdnpMIf+LHE0Dpqc00XCT+nq9t6l4aGOeNpia9iR6XgyHKuXv1rjYSI5BaWN5QDqUflAJFv0ya7ZBCHLeMfuQbSgPTPnG6LcLH+uVOM+dnIBFRIHGyCDlURgh7+JvDYCo1ZS04qzd3Xm/s/0lTZQJ/B2BxYBHK6sug+Ggx6M16Ge1BahdRHSHvytQKhB6E0pITMLXfKV/4QgK3jLbIKqOFM1vROFHW/NX5zdFw7NtjwL7GZoSIB/mqifaJ+bTKtF5qZfBRTmK14hIBuOccRB5GIPIoAhv+DeDjPDBWBsxvmMFaaQVDviGjaut/rkNgMQAVpyoUwyqqiVg2e11E2pu6l7xFgDtf3gEiVS2LgNv/4X4oPV6qxVx5zhBPz5CjG9FU2vUuiiJMd05LcrRWWKHg3QKwvGkBJv/FHUQkHl4Ow9rsGhAJp86USncl2F32rKCwgG+MeHxtSYO0wVDfVW+zlbABLUfKLlUBFvsW4fEvjyWTg50HJZkrrfDT+J6pz6b8imCk6ow4f0MUen8ngKTuCiIsjS+B3WFXnOAiFueG3WNHUvNkjExHl8PElFCRnYJR83/2MGiZPj8dzgmGbLoGT7bTjC7jJaaWQOs+zwmfe1vHr8ntc7yBXd2IBsW3qtakSnYixgPDbt8Zpb2cTzL3sLOH0qGOnSRP9c0FhNipvg/dN5s6KD3ds1NA2Vqjyhl5YkJq/V40gyhUvVVQRDX+R6HjcrJuuU1yh6b+pgLGSF2hdNRpAKBzAOOxgAejfu5C6hxRO4hqm7IFaLjSYKCL8Fs6HfOO1WK1haKhYCKKF3AA30++3NSSa1bTVgPthv22K7MbyeUx/gfIiuIzZiZJFQAAAABJRU5ErkJggg==" />
          </div>
          <div class="artist">${songName}</div>
          <div class="song">${artistName}</div>
          
          <div id="bars">
            ${contentBar}
          </div>

          <a href="${songUrl}" target="_BLANK">
            <center>
              <img src="data:image/png;base64, ${image}" width="300" height="300" class="cover" />
            </center>
          </a>
        </div>
      </foreignObject>
    </svg>
  `
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateRecentlyPlayedSVG(track: any) {
  const image = await loadImageB64(track.album.images[0].url)
  const artistName = track.artists[0].name.replace(/&/g, "&amp;")
  const songName = track.name.replace(/&/g, "&amp;")
  const songUrl = track.external_urls.spotify

  // Set height based on whether we have an image or not
  const height = 470 // Height with image

  return `
    <svg width="320" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Recently played on Spotify</title>
      <foreignObject width="320" height="${height}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            div {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            }

            .container {
              background-color: #121212;
              border-radius: 10px;
              padding: 10px 10px 20px 10px;
            }

            .playing {
              display: flex;
              justify-content: center;
              align-items: center;
              color: #53b14f;
              font-weight: bold;
              text-align: center;
              margin-bottom: 8px;
            }

            .artist {
              color: #fff;
              font-weight: bold;
              font-size: 20px;
              text-align: center;
              margin-bottom: 5px;
            }

            .song {
              color: #b3b3b3;
              font-size: 16px;
              text-align: center;
              margin-bottom: 15px;
            }

            .logo {
              margin-left: 5px;
            }

            .cover {
              border-radius: 5px;
              margin-bottom: 10px;
            }
          </style>
          <div class="playing">
            Recently played on <img class="logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAjCAYAAAAe2bNZAAAE5ElEQVRYR81WS08bVxQ+dzweY48fQCCBllJDmqpRSx6gKizSiAUbILZjA21KVEhF20hNlLb/IKu2m3QRKaqQogIRkAXhYQxFSJGCQqVKrVSBQtpCFqEQkrQhxnb8Yjxzp7oTmdjjsWd4LHIlLzz3PL57zvedexG8Qgu9Qlhg22Bqumr0+/L2VdAMOpBvtdgCoedBnhPvsw/YpcFLg9x2DrklMA19DVajkf4B0dQnAMDkSJgQedwfWot9fevcraBWYJrA1HXX5RUWWG8jhGq1Bk7aiVj8PfGfWOc754uq+aqCOXXT8bFOTw2oBVLb5zmhw9s6fj2XXU4wniFnF6LRF2qJtO6LPPQMN3s/zWafFcxuA0kCwILYO+IZO6sESBHMbrUmWwVwQjw70jLWK9/PAEPIuqfQFtNa+u3acU8wKyd1BhjPqPNXJdVgHkP8WRwiqxGI/RsDLsSBiEXQGXRgKDCAqcQk/RgbA4hS1QXx/WPYPVaTepg0LzJHTBZmcy5wQQ5mL89CeCUMIGqvAQFjLjeD/aQdiqqLsoKLh/nCiTMT68nIaWA8Q45riKY6k5szF2YgEU5oR5HFkn2dhUNfHQLjXmOaBRZw34jHRwaotNLANHtdG6mTdaF3AVZvrwJCCNgyFoqOFIHtgA2MxUbQGXXSdyxg4MM8RJ9EYf2vdfDf80PsaUyxkqSNtd+nzU1+yOXVZ4Ahd429pCzjTiG80MIBeVH4GA/Lk8uw/PMyEL4lV9XFKiiuLt78H/2Hy5u8OEmK8LIyjb2Nbxvz9Qu5eiIKokTcuD8OfISXTk+zNOQV5r0grk6ZuIGFAMxdnpMIf+LHE0Dpqc00XCT+nq9t6l4aGOeNpia9iR6XgyHKuXv1rjYSI5BaWN5QDqUflAJFv0ya7ZBCHLeMfuQbSgPTPnG6LcLH+uVOM+dnIBFRIHGyCDlURgh7+JvDYCo1ZS04qzd3Xm/s/0lTZQJ/B2BxYBHK6sug+Ggx6M16Ge1BahdRHSHvytQKhB6E0pITMLXfKV/4QgK3jLbIKqOFM1vROFHW/NX5zdFw7NtjwL7GZoSIB/mqifaJ+bTKtF5qZfBRTmK14hIBuOccRB5GIPIoAhv+DeDjPDBWBsxvmMFaaQVDviGjaut/rkNgMQAVpyoUwyqqiVg2e11E2pu6l7xFgDtf3gEiVS2LgNv/4X4oPV6qxVx5zhBPz5CjG9FU2vUuiiJMd05LcrRWWKHg3QKwvGkBJv/FHUQkHl4Ow9rsGhAJp86USncl2F32rKCwgG+MeHxtSYO0wVDfVW+zlbABLUfKLlUBFvsW4fEvjyWTg50HJZkrrfDT+J6pz6b8imCk6ow4f0MUen8ngKTuCiIsjS+B3WFXnOAiFueG3WNHUvNkjExHl8PElFCRnYJR83/2MGiZPj8dzgmGbLoGT7bTjC7jJaaWQOs+zwmfe1vHr8ntc7yBXd2IBsW3qtakSnYixgPDbt8Zpb2cTzL3sLOH0qGOnSRP9c0FhNipvg/dN5s6KD3ds1NA2Vqjyhl5YkJq/V40gyhUvVVQRDX+R6HjcrJuuU1yh6b+pgLGSF2hdNRpAKBzAOOxgAejfu5C6hxRO4hqm7IFaLjSYKCL8Fs6HfOO1WK1haKhYCKKF3AA30++3NSSa1bTVgPthv22K7MbyeUx/gfIiuIzZiZJFQAAAABJRU5ErkJggg==" />
          </div>
          <div class="artist">${songName}</div>
          <div class="song">${artistName}</div>

          <a href="${songUrl}" target="_BLANK">
            <center>
              <img src="data:image/png;base64, ${image}" width="300" height="300" class="cover" />
            </center>
          </a>
        </div>
      </foreignObject>
    </svg>
  `
}

function generateErrorSVG() {
  return `
    <svg width="320" height="125" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Spotify Error</title>
      <foreignObject width="320" height="125">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            div {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
            }

            .container {
              background-color: #121212;
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
            Error connecting to Spotify
          </div>
        </div>
      </foreignObject>
    </svg>
  `
}

export async function GET() {
  try {
    console.log("Fetching Spotify now playing data...")
    const currentlyPlaying = await nowPlaying()

    // Si hay una canción reproduciéndose actualmente
    if (currentlyPlaying && currentlyPlaying.item) {
      console.log("Currently playing:", currentlyPlaying.item.name, "by", currentlyPlaying.item.artists[0].name)
      const svg = await generateNowPlayingSVG(currentlyPlaying.item)

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=1",
        },
      })
    }

    // Si no hay nada reproduciéndose, obtener la última canción reproducida
    console.log("No track currently playing, fetching recently played")
    const recentlyPlayedData = await recentlyPlayed()

    if (recentlyPlayedData && recentlyPlayedData.items && recentlyPlayedData.items.length > 0) {
      // Obtener la canción más reciente
      const mostRecentTrack = recentlyPlayedData.items[0].track
      console.log("Recently played:", mostRecentTrack.name, "by", mostRecentTrack.artists[0].name)

      const svg = await generateRecentlyPlayedSVG(mostRecentTrack)

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=1",
        },
      })
    }

    // Si no hay historial de reproducción
    console.log("No recent plays found either")
    return new NextResponse(generateErrorSVG(), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=1",
      },
    })
  } catch (error) {
    console.error("Error generating Spotify now playing:", error)
    return new NextResponse(generateErrorSVG(), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=1",
      },
    })
  }
}
