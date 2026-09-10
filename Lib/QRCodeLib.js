const QRCode = require('qrcode');



/**

 * Gera um PNG de QR Code e retorna os dados em base64.

 * Mantém a interface esperada pelo comando gerarpagamento.

 */

class qrGenerator {
  
  constructor({ imagePath } = {}) {
    
    this.imagePath = imagePath;
    
  }
  

  
  async generate(data) {
    
    try {
      
      const dataUrl = await QRCode.toDataURL(String(data), {
        
        type: 'image/png',
        
        width: 1000,
        
        margin: 2,
        
        errorCorrectionLevel: 'M',
        
        color: {
          
          dark: '#000000',
          
          light: '#ffffff',
          
        },
        
      });
      

      
      return {
        
        status: 'success',
        
        response: dataUrl.replace(/^data:image\/png;base64,/, ''),
        
      };
      
    } catch (error) {
      
      return {
        
        status: 'error',
        
        response: error,
        
      };
      
    }
    
  }
  
}



module.exports.qrGenerator = qrGenerator;






























