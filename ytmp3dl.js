import axios from 'axios'

export async function ytmp3dl(url) {
  // Validasi URL YouTube sederhana
  if (!/^(https?:\/\/)?((www|m)\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)) {
    throw new Error('Invalid YouTube URL.')
  }

  try {
    // Meminta link unduhan langsung dari API publik Cobalt
    const { data } = await axios.post('https://api.cobalt.tools/api/json', {
      url: url,
      vQuality: '720',     // Kualitas video (tidak berpengaruh banyak karena kita ambil audio)
      isAudioOnly: true,   // PENTING: Hanya ambil audio jalurnya mp3
      audioFormat: 'mp3',  // Format target mp3
      aAcceptVol: true
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    // Jika Cobalt mengembalikan error atau tidak ada link
    if (data.status === 'error') {
      throw new Error(data.text || 'Cobalt API internal error.')
    }

    if (!data.url) {
      throw new Error('Download link dari Cobalt tidak ditemukan.')
    }

    return {
      title: data.picker || 'YouTube Audio',
      link: data.url // Link MP3 matang yang siap diunduh oleh bot.js
    }
  } catch (error) {
    const errorMsg = error.response?.data?.text || error.message
    throw new Error(`YouTube Cobalt Extraction Failed: ${errorMsg}`)
  }
}
