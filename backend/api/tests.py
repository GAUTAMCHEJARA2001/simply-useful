from django.test import TestCase

class HealthCheckTest(TestCase):
    def test_health_check_passes(self):
        """
        A basic health check to ensure the Django testing framework runs
        without sqlite/postgres operational errors and apps are loaded.
        """
        self.assertTrue(True)
