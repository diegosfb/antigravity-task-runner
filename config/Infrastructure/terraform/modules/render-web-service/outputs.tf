output "service_name" {
  value = render_web_service.app.name
}

output "service_url" {
  value = render_web_service.app.url
}
