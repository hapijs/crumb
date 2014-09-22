var Joi = require('joi');

module.exports = Joi.object().keys({
    key: Joi.string().optional(),
    size: Joi.number().optional(),
    autoGenerate: Joi.boolean().optional(),
    addToViewContext: Joi.boolean().optional(),
    cookieOptions: Joi.object().keys(null),
    restful: Joi.boolean().optional(),
    skip: Joi.any().optional(),
    allowOrigins: Joi.array().excludes(Joi.string().valid('*')).optional()
});