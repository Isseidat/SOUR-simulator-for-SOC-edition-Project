import * as templateService from '../services/templateService.js'

export { generateManagerErrorEmailHtml } from '../services/templateService.js'

// GET /api/v1/templates/:type
export const getTemplateByType = async (req, res) => {
  try {
    const { type } = req.params;

    const result = await templateService.getTemplateByTypeService({ type, query: req.query });
    
    if ( result.statusCode) {
      const { statusCode, ...data } = result;
      return res.status(statusCode).json(data);
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

