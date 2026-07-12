import axios from 'axios'

export async function ytmp3dl(url) {
  // Validasi URL YouTube sederhana
  if (!/^(https?:\/\/)?((www|m)\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)) {
    throw new Error('Invalid YouTube URL.')
  }

  try {
    // PERBAIKAN: Menggunakan endpoint utama API Cobalt terbaru
    const { data } = await axios.post('https://api.cobalt.tools/', {
      url: url,
      downloadMode: 'audio', // Format baru Cobalt untuk memilih mode audio
      audioFormat: 'mp3',    // Format target mp3
      audioBitrate: '320'    // Kualitas audio terbaik
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    // Jika API Cobalt merespons dengan status error
    if (data.status === 'error') {
      throw new Error(data.text || 'Cobalt API internal error.')
    }

    // Format respons Cobalt terbaru biasanya langsung mengirim properti .url
    if (!data.url) {
      throw new Error('Download link dari Cobalt tidak ditemukan.')
    }

    return {
      title: data.filename || 'YouTube Audio',
      link: data.url // Link MP3 matang yang siap diambil oleh bot.js
    }
  } catch (error) {
    const errorMsg = error.response?.data?.text || error.message
    throw new Error(`YouTube Cobalt Extraction Failed: ${errorMsg}`)
  }
}
