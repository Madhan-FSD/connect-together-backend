const Role = require("../../../models/common/role.Schema");
const {
  STATUS,
  errorResponse,
  responseHandler,
} = require("../../../utils/responseHandler");

exports.createRole = async (req, res) => {
  try {
    const { roleName, roleCode } = req.body;
    const newRole = new Role({
      roleName,
      roleCode,
    });
    const savedRole = await newRole.save();
    return responseHandler(
      res,
      STATUS.CREATED,
      "Role created successfully",
      savedRole,
    );
  } catch (error) {
    console.error("Error creating role:", error);
    return errorResponse(res, STATUS.SERVER_ERROR, "Failed to create role");
  }
};
