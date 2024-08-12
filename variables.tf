variable "OS_USERNAME" {
    type = string
}
variable "OS_TENANT_ID" {
    type = string
}
variable "OS_AUTH_URL" {
    type = string
    default = "https://rose-staging.fptcloud.com:5000/v3"
}
variable "OS_REGION_NAME" {
    type = string
    default = "HN01"
}
variable "OS_PASSWORD" {
    type = string
}