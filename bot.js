import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import axios from 'axios'
import { ytmp3dl } from './ytmp3dl.js'
import { spotifydl } from './spotifydl.js'
import { uploadTop4Top } from './top4top.js'

const TOKEN = process.env.DISCORD_BOT_TOKEN

if (!TOKEN) {
  console.error('Missing DISCORD_BOT_TOKEN environment variable. Set it in Secrets before starting the bot.')
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

// Restrict auto-detection to one channel via YT_TARGET_CHANNEL_ID, or leave unset to watch every channel the bot can see.
const TARGET_CHANNEL_ID = process.env.YT_TARGET_CHANNEL_ID || null

// Note: the middle alternative intentionally has no leading "&"/"?" requirement before
// "v=" — that used to reject the most common share format (youtube.com/watch?v=ID).
const YOUTUBE_URL_RE = /^(https?:\/\/)?((www|m)\.)?(youtube\.com\/watch\?[^\s]*?v=|youtu\.be\/)[\w-]{11}(\S*)?$/i
const YOUTUBE_URL_SEARCH_RE = /(https?:\/\/)?((www|m)\.)?(youtube\.com\/watch\?[^\s]*?v=|youtu\.be\/)[\w-]{11}(\S*)?/i

const SPOTIFY_URL_RE = /^https?:\/\/(open\.)?spotify\.com\/track\/[A-Za-z0-9]{22}(?:\?\S*)?$/i
const SPOTIFY_URL_SEARCH_RE = /https?:\/\/(open\.)?spotify\.com\/track\/[A-Za-z0-9]{22}(?:\?\S*)?/i

const LINK_SEARCH_RE = new RegExp(`${YOUTUBE_URL_SEARCH_RE.source}|${SPOTIFY_URL_SEARCH_RE.source}`, 'i')

const command = new SlashCommandBuilder()
  .setName('link2top4top')
  .setDescription('Ubah link YouTube atau Spotify menjadi link Top4Top')
  .addStringOption((option) =>
    option.setName('url').setDescription('Link video YouTube atau lagu Spotify').setRequired(true)
  )

function isSupportedLink(url) {
  return YOUTUBE_URL_RE.test(url) || SPOTIFY_URL_RE.test(url)
}

// Wraps a step's error with which stage failed and the upstream HTTP status (if any),
// so failures are actionable instead of a bare "status code 404".
function withStage(stage, error) {
  const status = error.response?.status
  const wrapped = new Error(`[${stage}]${status ? ` (HTTP ${status})` : ''} ${error.message}`)
  wrapped.stage = stage
  wrapped.cause = error
  return wrapped
}

async function resolveSource(url) {
  if (YOUTUBE_URL_RE.test(url)) {
    try {
      const { title, link } = await ytmp3dl(url)
      return { title, link }
    } catch (error) {
      throw withStage('konversi YouTube ke MP3', error)
    }
  }

  if (SPOTIFY_URL_RE.test(url)) {
    try {
      const { title, artist, link } = await spotifydl(url)
      return { title: artist ? `${title} - ${artist}` : title, link }
    } catch (error) {
      throw withStage('konversi Spotify ke MP3', error)
    }
  }

  throw new Error('Link tidak dikenali. Hanya mendukung YouTube dan Spotify.')
}

async function convertToTop4Top(url) {
  const { title, link } = await resolveSource(url)

  let buffer
  try {
    const response = await axios.get(link, { responseType: 'arraybuffer' })
    buffer = Buffer.from(response.data)
  } catch (error) {
    throw withStage('unduh file audio', error)
  }

  const safeTitle = (title || 'audio').replace(/[\\/:*?"<>|]/g, '_')

  let top4topLink
  try {
    top4topLink = await uploadTop4Top(buffer, `${safeTitle}.mp3`)
  } catch (error) {
    throw withStage('upload ke Top4Top', error)
  }

  return { title, top4topLink }
}

function buildResultEmbed(title, top4topLink) {
  return new EmbedBuilder()
    .setTitle('✅ Konversi berhasil')
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Judul', value: title || 'Unknown' },
      { name: 'Link Top4Top', value: top4topLink }
    )
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`)
  client.user.setActivity('/link2top4top')

  try {
    await client.application.commands.set([command])
    console.log('Slash command /link2top4top registered.')
  } catch (error) {
    console.error('Failed to register slash command:', error)
  }
})

client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  if (TARGET_CHANNEL_ID && message.channelId !== TARGET_CHANNEL_ID) return

  const match = message.content.match(LINK_SEARCH_RE)
  if (!match) return

  const url = match[0]
  const statusMsg = await message.reply('🔎 Link terdeteksi, sedang memproses...')

  try {
    const { title, top4topLink } = await convertToTop4Top(url)
    await statusMsg.edit({ content: null, embeds: [buildResultEmbed(title, top4topLink)] })
  } catch (error) {
    console.error('Gagal memproses link:', error)
    await statusMsg.edit(`❌ Gagal memproses link: ${error.message}`)
  }
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  if (interaction.commandName !== 'link2top4top') return

  const url = interaction.options.getString('url', true)

  if (!isSupportedLink(url)) {
    await interaction.reply({
      content: 'Berikan link YouTube atau Spotify yang valid. Contoh: `https://youtu.be/dQw4w9WgXcQ` atau `https://open.spotify.com/track/xxxxxxxxxxxxxxxxxxxxxx`',
      ephemeral: true
    })
    return
  }

  await interaction.deferReply()

  try {
    const { title, top4topLink } = await convertToTop4Top(url)
    await interaction.editReply({ embeds: [buildResultEmbed(title, top4topLink)] })
  } catch (error) {
    console.error('Gagal memproses link:', error)
    await interaction.editReply(`❌ Gagal memproses link: ${error.message}`)
  }
})

client.login(TOKEN)
