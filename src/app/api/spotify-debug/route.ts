import { NextResponse } from "next/server"
import { encode } from "base-64"

// Spotify scopes:
//   user-read-currently-playing
//   user-read-recently-played
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_SECRET_ID = process.env.SPOTIFY_SECRET_ID
const SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN

const REFRESH_TOKEN_URL = "https://accounts.spotify.com/api/token"

function getAuth() {
  return encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_SECRET_ID}`)
}

async function testRefreshToken() {
  try {
    // Verificar que los tokens existen
    const clientIdStatus = SPOTIFY_CLIENT_ID ? "✅ Presente" : "❌ Falta"
    const secretIdStatus = SPOTIFY_SECRET_ID ? "✅ Presente" : "❌ Falta"
    const refreshTokenStatus = SPOTIFY_REFRESH_TOKEN ? "✅ Presente" : "❌ Falta"

    // Si falta algún token, no podemos continuar
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_SECRET_ID || !SPOTIFY_REFRESH_TOKEN) {
      return {
        success: false,
        message: "Faltan uno o más tokens",
        diagnostics: {
          SPOTIFY_CLIENT_ID: clientIdStatus,
          SPOTIFY_SECRET_ID: secretIdStatus,
          SPOTIFY_REFRESH_TOKEN: refreshTokenStatus,
          authHeader: "No generado debido a tokens faltantes",
        },
      }
    }

    // Generar el encabezado de autenticación
    const authHeader = `Basic ${getAuth()}`

    // Intentar obtener un token de acceso
    const response = await fetch(REFRESH_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SPOTIFY_REFRESH_TOKEN,
      }),
    })

    const data = await response.json()

    if (data.access_token) {
      return {
        success: true,
        message: "Token de acceso obtenido correctamente",
        diagnostics: {
          SPOTIFY_CLIENT_ID: clientIdStatus,
          SPOTIFY_SECRET_ID: secretIdStatus,
          SPOTIFY_REFRESH_TOKEN: `${refreshTokenStatus} (válido)`,
          authHeader: `${authHeader.substring(0, 15)}...`, // Solo mostramos una parte por seguridad
        },
        tokenInfo: {
          accessToken: `${data.access_token.substring(0, 10)}...`, // Solo mostramos una parte por seguridad
          tokenType: data.token_type,
          expiresIn: data.expires_in,
          scope: data.scope,
        },
      }
    } else {
      return {
        success: false,
        message: "Error al obtener token de acceso",
        diagnostics: {
          SPOTIFY_CLIENT_ID: clientIdStatus,
          SPOTIFY_SECRET_ID: secretIdStatus,
          SPOTIFY_REFRESH_TOKEN: `${refreshTokenStatus} (posiblemente inválido)`,
          authHeader: `${authHeader.substring(0, 15)}...`, // Solo mostramos una parte por seguridad
        },
        error: data,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: "Error en la solicitud",
      error: (error as Error).message,
    }
  }
}

export async function GET() {
  const result = await testRefreshToken()

  return NextResponse.json(result)
}
