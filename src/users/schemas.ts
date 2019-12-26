import * as Joi from 'joi';

export const userSchema: Joi.ObjectSchema = Joi.object({
  id: Joi.number().required(),
  name: Joi.string().required(),
  role: Joi.string().required(),
  mobile1: Joi.number().required(),
  dob: Joi.date().required(),
  photo: Joi.any()
});
