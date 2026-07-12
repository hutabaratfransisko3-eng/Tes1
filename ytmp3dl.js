import ytdl from '@distube/ytdl-core'

export async function ytmp3dl(url) {
  if (!ytdl.validateURL(url)) {
    throw new Error('Invalid YouTube URL.')
  }

  try {
    // Mengambil informasi video langsung dari YouTube
    const info = await ytdl.getInfo(url)
    
    // Mencari format audio terbaik tanpa video
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio', 
      filter: 'audioonly' 
    })

    if (!format || !format.url) {
      throw new Error('No suitable audio format found.')
    }

    return {
      title: info.videoDetails.title || 'Unknown Video',
      link: format.url // Link langsung dari server Google Video
    }
  } catch (error) {
    throw new Error(`YouTube Extraction Failed: ${error.message}`)
  }
}
