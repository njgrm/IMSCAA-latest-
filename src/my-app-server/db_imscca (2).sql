-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: db_imscca
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attendance` (
  `attendance_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `scan_time` datetime(6) NOT NULL,
  `date_added` datetime(6) NOT NULL,
  PRIMARY KEY (`attendance_id`),
  KEY `user_id` (`user_id`,`event_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `event-activity` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clearance`
--

DROP TABLE IF EXISTS `clearance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clearance` (
  `clearance_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `request_date` date NOT NULL,
  `completion_date` date DEFAULT NULL,
  `status` enum('approved','denied','pending') NOT NULL,
  `date_added` datetime(6) NOT NULL,
  PRIMARY KEY (`clearance_id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `clearance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clearance`
--

LOCK TABLES `clearance` WRITE;
/*!40000 ALTER TABLE `clearance` DISABLE KEYS */;
/*!40000 ALTER TABLE `clearance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clearance step`
--

DROP TABLE IF EXISTS `clearance step`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clearance step` (
  `step_id` int(11) NOT NULL,
  `clearance_id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `approver_id` int(11) NOT NULL,
  `status` enum('approved','denied','pending') NOT NULL,
  `approval_date` date NOT NULL,
  `date_added` datetime(6) NOT NULL,
  PRIMARY KEY (`step_id`),
  KEY `clearance_id` (`clearance_id`,`department_id`,`approver_id`),
  KEY `approver_id` (`approver_id`),
  CONSTRAINT `clearance step_ibfk_1` FOREIGN KEY (`clearance_id`) REFERENCES `clearance` (`clearance_id`),
  CONSTRAINT `clearance step_ibfk_2` FOREIGN KEY (`approver_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clearance step`
--

LOCK TABLES `clearance step` WRITE;
/*!40000 ALTER TABLE `clearance step` DISABLE KEYS */;
/*!40000 ALTER TABLE `clearance step` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `club`
--

DROP TABLE IF EXISTS `club`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `club` (
  `club_id` int(11) NOT NULL AUTO_INCREMENT,
  `club_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `president_id` int(11) DEFAULT NULL,
  `category` enum('academic','sports','cultural') NOT NULL,
  `club_adviser_id` int(11) DEFAULT NULL,
  `date_added` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`club_id`),
  UNIQUE KEY `uq_club_name` (`club_name`),
  KEY `president_id` (`president_id`),
  KEY `club_adviser_id` (`club_adviser_id`),
  CONSTRAINT `club_ibfk_1` FOREIGN KEY (`president_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `club_ibfk_2` FOREIGN KEY (`club_adviser_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `club`
--

LOCK TABLES `club` WRITE;
/*!40000 ALTER TABLE `club` DISABLE KEYS */;
INSERT INTO `club` VALUES (2,'Information Technology Society','',2,'academic',NULL,'2025-04-26 21:15:15.000000'),(3,'Information Systems Society','',7,'academic',NULL,'2025-04-28 01:41:54.000000'),(7,'Web Dev Club','',21,'academic',NULL,'2025-05-05 10:49:09.000000'),(8,'Peers','',53,'academic',NULL,'2025-05-06 08:55:49.000000');
/*!40000 ALTER TABLE `club` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `club membership`
--

DROP TABLE IF EXISTS `club membership`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `club membership` (
  `membership_id` int(11) NOT NULL,
  `club_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `join_date` date NOT NULL,
  `payment_status` enum('paid','unpaid','pending') NOT NULL,
  `qr_code` varchar(255) NOT NULL,
  `date_added` datetime(6) NOT NULL,
  PRIMARY KEY (`membership_id`),
  KEY `club_id` (`club_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `club membership_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `club membership_ibfk_2` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `club membership`
--

LOCK TABLES `club membership` WRITE;
/*!40000 ALTER TABLE `club membership` DISABLE KEYS */;
/*!40000 ALTER TABLE `club membership` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `deletion_requests`
--

DROP TABLE IF EXISTS `deletion_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `deletion_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('user','requirement','club','transaction') NOT NULL COMMENT 'Type of entity to delete',
  `target_id` int(11) NOT NULL COMMENT 'ID of the entity to delete (user_id, requirement_id, club_id, or transaction_id)',
  `club_id` int(11) NOT NULL COMMENT 'Club context for the request',
  `requested_by` int(11) NOT NULL COMMENT 'User who requested the deletion',
  `status` enum('pending','approved','denied') DEFAULT 'pending' COMMENT 'Approval status',
  `reason` varchar(255) DEFAULT NULL COMMENT 'Optional reason for deletion',
  `requested_at` datetime DEFAULT current_timestamp(),
  `approved_by` int(11) DEFAULT NULL COMMENT 'Adviser who approved/denied',
  `approved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_deletion_requests_requested_by` (`requested_by`),
  KEY `fk_deletion_requests_approved_by` (`approved_by`),
  KEY `fk_deletion_requests_club` (`club_id`),
  KEY `idx_deletion_requests_status` (`status`),
  KEY `idx_deletion_requests_type_target` (`type`,`target_id`),
  CONSTRAINT `fk_deletion_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_deletion_requests_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deletion_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `deletion_requests`
--

LOCK TABLES `deletion_requests` WRITE;
/*!40000 ALTER TABLE `deletion_requests` DISABLE KEYS */;
INSERT INTO `deletion_requests` VALUES (1,'user',52,2,2,'pending','Request to delete user.','2025-05-22 13:22:30',NULL,NULL),(2,'requirement',2,2,2,'pending','Request to delete requirement.','2025-05-22 13:23:04',NULL,NULL),(3,'requirement',2,2,2,'pending','Request to delete requirement.','2025-05-22 13:39:44',NULL,NULL),(4,'transaction',126,2,2,'pending','Request to delete transaction.','2025-05-22 13:39:48',NULL,NULL),(5,'transaction',115,2,2,'pending','Hhahahahha','2025-05-22 13:40:31',NULL,NULL),(6,'transaction',126,2,2,'pending','Request to delete transaction.','2025-05-22 14:09:47',NULL,NULL),(7,'transaction',127,2,2,'pending','Request to delete transaction.','2025-05-22 14:09:47',NULL,NULL);
/*!40000 ALTER TABLE `deletion_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event-activity`
--

DROP TABLE IF EXISTS `event-activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event-activity` (
  `event_id` int(11) NOT NULL AUTO_INCREMENT,
  `event_name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `start_datetime` datetime(6) NOT NULL,
  `end_datetime` datetime(6) NOT NULL,
  `location` varchar(255) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `status` enum('scheduled','ongoing','canceled') NOT NULL,
  `club_id` int(11) NOT NULL,
  `date_added` datetime(6) NOT NULL,
  PRIMARY KEY (`event_id`),
  KEY `club_id` (`club_id`),
  CONSTRAINT `event-activity_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event-activity`
--

LOCK TABLES `event-activity` WRITE;
/*!40000 ALTER TABLE `event-activity` DISABLE KEYS */;
/*!40000 ALTER TABLE `event-activity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invite_links`
--

DROP TABLE IF EXISTS `invite_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invite_links` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(64) NOT NULL,
  `role` enum('member','officer') NOT NULL,
  `allowed_signups` int(11) NOT NULL DEFAULT 1,
  `used_count` int(11) NOT NULL DEFAULT 0,
  `expiry` datetime NOT NULL,
  `club_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `club_id` (`club_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `invite_links_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `invite_links_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invite_links`
--

LOCK TABLES `invite_links` WRITE;
/*!40000 ALTER TABLE `invite_links` DISABLE KEYS */;
INSERT INTO `invite_links` VALUES (1,'00178a0823912cfc97b48349f42bfd565fd51d7b154bf08f','member',1,0,'2025-05-20 14:58:47',2,2,'2025-05-19 20:58:47'),(2,'810ec0453f2f79c5857727031ab5c11a879e45e67b11fafd','member',1,0,'2025-05-20 15:09:16',2,2,'2025-05-19 21:09:16'),(3,'12d81bb79e618ada4b4edc9be252feca91727bc96817169b','officer',1,0,'2025-05-20 15:16:03',2,2,'2025-05-19 21:16:03'),(4,'e63fe5c911c5fec2f68f16a98b4558922cca2e9e0c2f2fea','member',1,1,'2025-05-20 15:31:56',2,2,'2025-05-19 21:31:56'),(5,'95bfd60882f862f59a8ddd1062e17061ef359e978db63cde','officer',1,1,'2025-05-20 15:34:12',2,2,'2025-05-19 21:34:12'),(6,'4fd850bd728f8749229cdc93580fe8fac126eaf77c494a46','member',1,1,'2025-05-20 16:00:48',2,2,'2025-05-19 22:00:48'),(7,'aefcaada14ce134928cc30e80e2486b8e75f8b502ef39e8d','member',1,1,'2025-05-20 16:29:28',2,2,'2025-05-19 22:29:28'),(8,'27ca4e9701e51f8ae669b23064041284837a403bb979214d','member',1,1,'2025-05-20 16:32:35',2,2,'2025-05-19 22:32:35'),(9,'0b0b24dc6e1ad53cd4610c59f096a0150df54b89ce5718d0','member',1,1,'2025-05-20 16:49:46',2,2,'2025-05-19 22:49:46'),(10,'cad30121ac766ed76bfb2b95cbc6d86b6194ce094849e1c1','member',1,1,'2025-05-20 16:51:44',2,2,'2025-05-19 22:51:44'),(11,'294400578b25a90f601eaa11410c9012db7f6656e1be6bcd','member',1,1,'2025-05-20 17:01:59',2,2,'2025-05-19 23:01:59'),(12,'971464d2195118c651e5c94aedb62b0823c862a50705684b','member',1,1,'2025-05-20 17:07:27',2,2,'2025-05-19 23:07:27'),(13,'560394afae839419dbb2b78f148755384e8ab132d026239f','member',1,1,'2025-05-20 17:11:36',2,2,'2025-05-19 23:11:36'),(14,'883a1ffca93432880bd7a625b965ec0400f2623460d466c5','member',1,1,'2025-05-20 17:14:46',2,2,'2025-05-19 23:14:46'),(15,'5efc9e44ed4e5fa819123ad89390670e112fb0a3576d081d','officer',1,0,'2025-05-20 17:17:26',2,2,'2025-05-19 23:17:26'),(16,'73a292e1a4a40c51dda4b212b835088b9c619db47060a136','member',1,0,'2025-05-20 17:18:01',2,2,'2025-05-19 23:18:01'),(17,'68078830d5a242ab707cc10465dc25916af8510902acae8a','officer',1,1,'2025-05-20 17:18:08',2,2,'2025-05-19 23:18:08'),(18,'893b82d0a19dab31a0fa762abc028692050ef317cb83982d','member',1,1,'2025-05-20 17:20:48',2,2,'2025-05-19 23:20:48'),(19,'872cd8abbcbd3a6ee300e05bc19907baec0a6d2b4c3577f1','member',1,1,'2025-05-20 17:23:56',2,2,'2025-05-19 23:23:56'),(20,'f9271233a50a3f0aeeaca3931009a4a4f177ff7ffd816a6c','member',1,0,'2025-05-19 18:26:01',2,2,'2025-05-20 00:25:57'),(21,'5394cd66fa7164b0c3d261fb03a1b905c3da44096ec6381e','member',1,0,'2025-05-20 04:31:37',2,2,'2025-05-20 00:31:37'),(22,'3ab6924113377a146d66f7604456b910b3a42ba4f577f918','member',1,0,'2025-05-19 18:32:12',2,2,'2025-05-20 00:32:02'),(23,'2b6f207223888e9ed43ef34fe5a5d8d0acedf384e04a706e','member',1,0,'2025-05-19 18:32:39',2,2,'2025-05-20 00:32:29'),(24,'e52b861580a908f395268e8554d3e6aed73410d1c03afaef','officer',1,1,'2025-05-20 18:36:22',2,2,'2025-05-20 00:36:22'),(27,'e3a7f2a7c76427a803285c2248b80566a5e2c671691cb77f','member',1,0,'2025-05-20 02:17:36',2,2,'2025-05-20 08:17:32'),(28,'b836297a91c629b87c36a9886ee2745bb871ce58b0cb0896','member',1,0,'2025-05-20 02:18:03',2,2,'2025-05-20 08:17:53'),(29,'5a921be084b6af011d89c8d695b6b5393306d0da93582443','member',1,1,'2025-05-21 02:19:15',2,2,'2025-05-20 08:19:15'),(30,'5a1357adef8663b272bc45d3c35333e4e4637f77daaf50f9','member',1,1,'2025-05-21 02:33:38',2,2,'2025-05-20 08:33:38'),(31,'75b564fd975921364f2d2cecf7054b0e10a968ee6b413a7f','member',1,1,'2025-05-21 02:48:03',2,2,'2025-05-20 08:48:03'),(32,'f73106ad58885c1c29e3a2ef2a18b491a06eafdf1bb40228','member',1,1,'2025-05-21 03:11:19',2,2,'2025-05-20 09:11:19'),(33,'11b32e702399a66bcb6a89220074369451348183011b1e55','member',1,1,'2025-05-21 03:26:49',2,2,'2025-05-20 09:26:49'),(34,'e0c56baad6a027bd60a17b28160c852883e49bbe19e81dde','member',1,1,'2025-05-21 03:37:25',2,2,'2025-05-20 09:37:25'),(35,'852d0067fa23cb72c3d76277222a5f055042e21eb14c4aa5','member',1,1,'2025-05-21 03:42:59',2,2,'2025-05-20 09:42:59'),(36,'d7642d30c0d59a02c2e37e0a7b26c413fb237c8c70fb5d9d','member',1,1,'2025-05-21 04:03:21',2,2,'2025-05-20 10:03:21'),(37,'502555c8177c8d687b911b4cf6495b1dbf4ed87b4a4c2dbd','member',1,1,'2025-05-21 09:29:29',2,2,'2025-05-20 15:29:29');
/*!40000 ALTER TABLE `invite_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `requirements`
--

DROP TABLE IF EXISTS `requirements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `requirements` (
  `requirement_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `start_datetime` datetime(6) NOT NULL,
  `end_datetime` datetime(6) NOT NULL,
  `location` varchar(255) NOT NULL,
  `requirement_type` enum('event','activity','fee') NOT NULL,
  `status` enum('scheduled','ongoing','canceled','completed') NOT NULL,
  `club_id` int(11) NOT NULL,
  `amount_due` decimal(10,2) DEFAULT 0.00,
  `req_picture` longtext DEFAULT NULL,
  `date_added` datetime(6) DEFAULT current_timestamp(6),
  PRIMARY KEY (`requirement_id`),
  KEY `club_id` (`club_id`),
  CONSTRAINT `requirements_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
