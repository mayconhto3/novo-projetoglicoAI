// supabase/functions/whatsapp-bridge/services/mediaService.ts
// Especialista em Processamento de Mídia
// Responsabilidade: Download, conversão e limpeza de mídias (imagens e áudio)

export interface ProcessedMedia {
    mimeType: string;
    data: string; // Base64 limpo (sem prefixos)
}

/**
 * Processa entrada de mídia (base64 ou URL)
 * 
 * Estratégia:
 * 1. Caminho Feliz: Base64 direto (rápido, sem download)
 * 2. Caminho de Resiliência: Download via URL (fallback)
 * 
 * Limpeza:
 * - Remove prefixos data:image/jpeg;base64,
 * - Normaliza tipos do WhatsApp/n8n para MIME types padrão
 * 
 * Segurança:
 * - Bloqueia URLs internas do WhatsApp (.whatsapp.net)
 * - Valida resposta HTTP antes de processar
 * 
 * @param mediaBase64 - Base64 da mídia (pode ter prefixo)
 * @param mediaUrl - URL externa da mídia (fallback)
 * @param mediaType - Tipo do WhatsApp/n8n (audio, ptt, image)
 * @returns Mídia processada ou null se falhar
 */
export async function processMediaInput(
    mediaBase64: string | null,
    mediaUrl: string | null,
    mediaType: string
): Promise<ProcessedMedia | null> {
    // 1. Caminho Feliz: Base64 direto (Rápido)
    if (mediaBase64) {
        console.log('[MediaService] Processando base64 direto...');

        // Remove prefixo se existir (ex: "data:image/jpeg;base64,")
        const cleanData = String(mediaBase64).replace(/^data:.*,/, '');

        let mimeType = 'image/jpeg'; // Default

        // Mapeamento de tipos do WhatsApp/n8n para MIME types padrão
        if (mediaType === 'audio' || mediaType === 'ptt') {
            mimeType = 'audio/ogg';
        } else if (mediaType === 'image') {
            mimeType = 'image/jpeg';
        }

        console.log(`[MediaService] Mídia processada: ${mimeType}, ${cleanData.length} bytes`);
        return { mimeType, data: cleanData };
    }

    // Limpeza da URL (remove backslashes que podem vir do n8n/WhatsApp)
    const cleanUrl = mediaUrl ? mediaUrl.replace(/\\/g, '') : null;

    // 2. Caminho de Resiliência: Download via URL
    if (cleanUrl && !cleanUrl.includes('whatsapp.net')) {
        try {
            console.log(`[MediaService] Baixando mídia externa: ${cleanUrl}`);
            const response = await fetch(cleanUrl);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

            const mimeType = blob.type || 'image/jpeg';
            console.log(`[MediaService] Download concluído: ${mimeType}, ${base64.length} bytes`);

            return {
                mimeType,
                data: base64,
            };
        } catch (error) {
            console.error('[MediaService] Erro ao baixar URL:', error);
            return null;
        }
    }

    // 3. Bloqueio de URLs internas do WhatsApp
    if (cleanUrl && cleanUrl.includes('whatsapp.net')) {
        console.warn('[MediaService] URL interna do WhatsApp bloqueada (segurança)');
        return null;
    }

    console.log('[MediaService] Nenhuma mídia para processar');
    return null;
}
