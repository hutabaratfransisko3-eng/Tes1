import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import axios from 'axios'
import { ytmp3dl } from './ytmp3dl.js'
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

// Regex untuk mendeteksi link YouTube secara ketat dan pencarian di pesan
const YOUTUBE_URL_RE = /^(https?:\/\/)?((www|m)\.)?(youtube\.com\/watch\?[^\s]*?v=|youtu\.be\/)[\w-]{11}(\S*)?$/i
const YOUTUBE_URL_SEARCH_RE = /(https?:\/\/)?((www|m)\.)?(youtube\.com\/watch\?[^\s]*?v=|youtu\.be\/)[\w-]{11}(\S*)?/i

// Pendaftaran Slash Command
const command = new SlashCommandBuilder()
  .setName('yt2top4top')
  .setDescription('Ubah link YouTube menjadi link Top4Top')
  .addStringOption((option) =>
    option.setName('url').setDescription('Link video YouTube').setRequired(true)
  )

// Fungsi inti untuk mengunduh audio YouTube lalu mengunggahnya ke Top4Top
async function convertToTop4Top(url) {
  // 1. Ambil link konversi dari scraping yt1s.com via ytmp3dl.js
  const { title, link } = await ytmp3dl(url)

  // 2. Download file audio (.mp3) ke dalam bentuk Buffer
  let buffer
  try {
    const response = await axios.get(link, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://yt1s.com/',
        'Origin': 'https://yt1s.com'
      }
    })
    buffer = Buffer.from(response.data)
  } catch (error) {
    throw new Error(`Gagal mengunduh file audio dari server konverter: ${error.message}`)
  }

  // 3. Bersihkan judul dari karakter ilegal untuk nama file
  const safeTitle = (title || 'YouTube_Audio').replace(/[\\/:*?"<>|]/g, '_')

  // 4. Upload file Buffer tersebut langsung ke Top4Top
  let top4topLink
  try {
    top4topLink = await uploadTop4Top(buffer, `${safeTitle}.mp3`)
  } catch (error) {
    throw new Error(`Gagal mengupload file ke Top4Top: ${error.message}`)
  }

  return { title, top4topLink }
}

// Template tampilan Embed hasil konversi
function buildResultEmbed(title, top4topLink) {
  return new EmbedBuilder()
    .setTitle('✅ Konversi YouTube Berhasil')
    .setColor(0xff0000)
    .addFields(
      { name: 'Judul Video', value: title || 'Unknown' },
      { name: 'Link Top4Top', value: top4topLink }
    )
    .setTimestamp()
}

// Event saat bot siap berjalan
client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`)
  client.user.setActivity('/yt2top4top')

  try {
    await client.application.commands.set([command])
    console.log('Slash command /yt2top4top berhasil didaftarkan.')
  } catch (error) {
    console.error('Gagal mendaftarkan slash command:', error)
  }
})

// Backup event handler untuk versi discord.js tertentu
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`)
  client.user.setActivity('/yt2top4top')
  try {
    await client.application.commands.set([command])
  } catch (e) {}
})

// Deteksi otomatis jika ada yang mengirim link YouTube di chat biasa
client.on('messageCreate', async (message) => {
  if (message.author.bot) return

  const match = message.content.match(YOUTUBE_URL_SEARCH_RE)
  if (!match) return

  const url = match[0]
  const statusMsg = await message.reply('🔎 Link YouTube terdeteksi, sedang memproses konversi...')

  try {
    const { title, top4topLink } = await convertToTop4Top(url)
    await statusMsg.edit({ content: null, embeds: [buildResultEmbed(title, top4topLink)] })
  } catch (error) {
    console.error('Gagal memproses link pesan:', error)
    await statusMsg.edit(`❌ Gagal memproses link: ${error.message}`)
  }
})

// Handler untuk merespons Slash Command /yt2top4top
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  if (interaction.commandName !== 'yt2top4top') return

  const url = interaction.options.getString('url', true)

  if (!YOUTUBE_URL_RE.test(url)) {
    await interaction.reply({
      content: 'Harap masukkan tautan YouTube yang valid!',
      ephemeral: true
    })
    return
  }

  await interaction.deferReply()

  try {
    const { title, top4topLink } = await convertToTop4Top(url)
    await interaction.editReply({ embeds: [buildResultEmbed(title, top4topLink)] })
  } catch (error) {
    console.error('Gagal memproses slash command:', error)
    await interaction.editReply(`❌ Gagal memproses link: ${error.message}`)
  }
})

client.login(TOKEN)