export default defineEventHandler((event) => {
  setResponseHeader(event, "X-Application-Middleware", "preserved");
});
