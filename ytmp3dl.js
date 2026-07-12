import axios from 'axios'

export async function ytmp3dl(url) {
  // Validasi URL YouTube
  if (!/^(https?:\/\/)?((www|m)\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)) {
    throw new Error('Invalid YouTube URL.')
  }

  try {
    // ---------------------------------------------------------
    // TAHAP 1: Kirim link ke yt1s.com untuk cari video dan token
    // ---------------------------------------------------------
    const searchForm = new URLSearchParams()
    searchForm.append('q', url)
    searchForm.append('vt', 'home')

    const searchRes = await axios.post('https://yt1s.com/api/ajaxSearch/index', searchForm, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://yt1s.com',
        'Referer': 'https://yt1s.com/en'
      }
    })

    const searchData = searchRes.data
    if (searchData.status !== 'ok') {
      throw new Error('Gagal mendapatkan data dari server konverter.')
    }

    const vid = searchData.vid
    const title = searchData.title

    // Ambil token rahasia (k) dari daftar kualitas MP3 yang tersedia
    const mp3Keys = Object.keys(searchData.links?.mp3 || {})
    if (mp3Keys.length === 0) {
      throw new Error('Format MP3 tidak tersedia untuk video ini.')
    }
    
    // Biasanya mp3128 adalah key yang standar, kita ambil index pertama saja
    const kToken = searchData.links.mp3[mp3Keys[0]].k

    // ---------------------------------------------------------
    // TAHAP 2: Gunakan token (k) untuk mendapatkan link download asli
    // ---------------------------------------------------------
    const convertForm = new URLSearchParams()
    convertForm.append('vid', vid)
    convertForm.append('k', kToken)

    const convertRes = await axios.post('https://yt1s.com/api/ajaxConvert/convert', convertForm, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://yt1s.com',
        'Referer': 'https://yt1s.com/en'
      }
    })

    const convertData = convertRes.data
    if (convertData.status !== 'ok' || !convertData.dlink) {
      throw new Error('Gagal mengonversi video ke MP3.')
    }

    return {
      title: title || 'YouTube Audio',
      link: convertData.dlink // Link unduhan matang siap dioper ke top4top
    }

  } catch (error) {
    throw new Error(`Scraper Failed: ${error.message}`)
  }
}
