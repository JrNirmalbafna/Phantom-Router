use std::time::Instant;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum Priority {
    Low,
    Standard,
    Critical,
}

impl Priority {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "low" => Priority::Low,
            "critical" => Priority::Critical,
            _ => Priority::Standard,
        }
    }
}

/// Context flowing through the middleware and decision engine.
#[derive(Debug, Clone)]
pub struct RequestContext {
    pub request_id: String,
    pub client_ip: Option<String>,
    pub priority: Priority,
    pub start_time: Instant,
}

impl RequestContext {
    pub fn new(request_id: String, client_ip: Option<String>, priority: &str) -> Self {
        Self {
            request_id,
            client_ip,
            priority: Priority::from_str(priority),
            start_time: Instant::now(),
        }
    }
}
