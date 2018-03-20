'use strict'

/**
 * @summary Etcher exit codes
 * @namespace EXIT_CODES
 * @public
 */
module.exports = {

  /**
   * @property {Number} SUCCESS
   * @memberof EXIT_CODES
   *
   * @description
   * This exit code is used to represent a successful exit
   * status, with no problems on the way.
   */
  SUCCESS: 0,

  /**
   * @property {Number} GENERAL_ERROR
   * @memberof EXIT_CODES
   *
   * @description
   * This exit code is used to represent a general error
   * situation. If the reasons of the error is not
   * documented as a specialised error code, this one
   * should be used.
   */
  GENERAL_ERROR: 1,

  /**
   * @property {Number} VALIDATION_ERROR
   * @memberof EXIT_CODES
   *
   * @description
   * This exit code is used to represent a validation error.
   */
  VALIDATION_ERROR: 2,

  /**
   * @property {Number} CANCELLED
   * @memberof EXIT_CODES
   *
   * @description
   * This exit code is used to represent a cancelled write process.
   */
  CANCELLED: 3

}