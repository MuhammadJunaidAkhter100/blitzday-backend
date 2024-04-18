
export default class ApiResponse {
  static result = (res, data, status) => {
    res.status(status);
    res.json({
      data,
      success: true,
    });
  };
}
