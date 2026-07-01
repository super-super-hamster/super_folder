export const isImage = (ext: string) => ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'].includes(ext.toLowerCase())
export const isCode = (ext: string) => ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.go', '.py', '.java', '.c', '.cpp', '.cs', '.sh', '.bat', '.xml', '.yaml', '.yml', '.sql', '.php', '.rb', '.rs', '.swift', '.kt', '.dart', '.vue', '.svelte', '.h', '.hpp', '.m'].includes(ext.toLowerCase())
export const isMarkdown = (ext: string) => ['.md', '.markdown'].includes(ext.toLowerCase())
export const isText = (ext: string) => ['.txt', '.log', '.ini', '.env', '.gitignore', '.conf', '.cfg', '.npmrc', '.editorconfig', '.properties'].includes(ext.toLowerCase())
export const isVideo = (ext: string) => ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.wmv'].includes(ext.toLowerCase())
export const isAudio = (ext: string) => ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(ext.toLowerCase())
export const isPdf = (ext: string) => ext.toLowerCase() === '.pdf'
export const isDocx = (ext: string) => ext.toLowerCase() === '.docx'
export const isXlsx = (ext: string) => ext.toLowerCase() === '.xlsx' || ext.toLowerCase() === '.csv'
export const isEpub = (ext: string) => ext.toLowerCase() === '.epub'

export const isPreviewSupported = (ext: string) => {
    return isImage(ext) || isCode(ext) || isMarkdown(ext) || isText(ext) || isVideo(ext) || isAudio(ext) || isPdf(ext) || isDocx(ext) || isXlsx(ext) || isEpub(ext)
}

export const isEditableText = (ext: string) => {
    return isText(ext)
}
